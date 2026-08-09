with source as (
    select * from stadtrad_observations
),

validated as (
    select
        observation_id,
        datastream_id,
        available_bikes,
        observed_at,
        received_at,
        ingested_at,
        date_trunc('hour', observed_at) as observed_hour,
        datediff('second', observed_at, received_at) as source_latency_seconds
    from source
    where observation_id is not null
      and datastream_id is not null
      and available_bikes >= 0
)

select * from validated
