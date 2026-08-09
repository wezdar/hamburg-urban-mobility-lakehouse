select
    observed_hour,
    datastream_id,
    count(*) as observation_count,
    round(avg(available_bikes), 2) as avg_available_bikes,
    min(available_bikes) as min_available_bikes,
    max(available_bikes) as max_available_bikes,
    round(avg(source_latency_seconds), 2) as avg_source_latency_seconds
from {{ ref('stg_stadtrad_observations') }}
group by 1, 2
