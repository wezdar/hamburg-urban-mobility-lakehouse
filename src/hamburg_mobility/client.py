"""Small, dependency-free client for Hamburg's OGC SensorThings API."""

from __future__ import annotations

import json
import random
import time
from collections.abc import Iterator, Mapping
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_ROOT = "https://iot.hamburg.de/v1.1"
SERVICE_FILTER = "properties/serviceName eq 'HH_STA_StadtRad'"
BIKE_FILTER = f"{SERVICE_FILTER} and properties/layerName eq 'Fahrraeder'"


class SensorThingsError(RuntimeError):
    """Raised after a SensorThings request exhausts its retry budget."""


class SensorThingsClient:
    """Read-only API client with pagination, timeouts and bounded retries."""

    def __init__(
        self,
        base_url: str = API_ROOT,
        *,
        timeout_seconds: int = 45,
        retries: int = 4,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.retries = retries

    def get_json(
        self,
        path_or_url: str,
        params: Mapping[str, str | int] | None = None,
    ) -> dict[str, Any]:
        url = (
            path_or_url
            if path_or_url.startswith("http")
            else f"{self.base_url}/{path_or_url.lstrip('/')}"
        )
        if params:
            url = f"{url}?{urlencode(params)}"

        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                request = Request(
                    url,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": "hamburg-urban-mobility-lakehouse/1.0",
                    },
                )
                with urlopen(request, timeout=self.timeout_seconds) as response:  # noqa: S310
                    return json.load(response)
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
                last_error = exc
                if isinstance(exc, HTTPError) and exc.code < 500 and exc.code != 429:
                    break
                if attempt < self.retries:
                    time.sleep(min(8.0, (2**attempt) + random.random()))

        message = f"GET failed after {self.retries + 1} attempts: {url}"
        raise SensorThingsError(message) from last_error

    def paginate(
        self,
        path: str,
        params: Mapping[str, str | int],
        *,
        max_pages: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        payload = self.get_json(path, params)
        page = 0
        while True:
            yield from payload.get("value", [])
            page += 1
            next_link = payload.get("@iot.nextLink")
            if not next_link or (max_pages is not None and page >= max_pages):
                return
            payload = self.get_json(next_link)

    def bike_datastreams(self, *, include_latest: bool = False) -> list[dict[str, Any]]:
        params: dict[str, str | int] = {
            "$filter": BIKE_FILTER,
            "$top": 500,
            "$orderby": "@iot.id asc",
        }
        if include_latest:
            params["$expand"] = (
                "Thing($expand=Locations),"
                "Observations($select=result,phenomenonTime;$orderby=phenomenonTime desc;$top=1)"
            )
        else:
            params["$select"] = "@iot.id,name,phenomenonTime,properties"
        return list(self.paginate("Datastreams", params))

    def observations(
        self,
        stream_id: int,
        *,
        start: str | None = None,
        end: str | None = None,
        limit: int | None = None,
        descending: bool = False,
        max_pages: int | None = None,
    ) -> Iterator[dict[str, Any]]:
        filters: list[str] = []
        if start:
            filters.append(f"phenomenonTime ge {start}")
        if end:
            filters.append(f"phenomenonTime lt {end}")
        params: dict[str, str | int] = {
            "$select": "@iot.id,result,phenomenonTime,resultTime,parameters",
            "$orderby": f"phenomenonTime {'desc' if descending else 'asc'}",
            "$top": min(limit or 10_000, 10_000),
        }
        if filters:
            params["$filter"] = " and ".join(filters)

        seen = 0
        for observation in self.paginate(
            f"Datastreams({stream_id})/Observations",
            params,
            max_pages=max_pages,
        ):
            if limit is not None and seen >= limit:
                return
            yield observation
            seen += 1
