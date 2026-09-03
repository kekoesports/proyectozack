FROM alpine:3.20

ARG SUPERCRONIC_VERSION=v0.2.29
ARG SUPERCRONIC_SHA1=cd48d45c4b10f3f0bfdd3a57d054cd05ac96812b

RUN apk add --no-cache ca-certificates curl tzdata \
    && curl -fsSLo /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/${SUPERCRONIC_VERSION}/supercronic-linux-amd64" \
    && echo "${SUPERCRONIC_SHA1}  /usr/local/bin/supercronic" | sha1sum -c - \
    && chmod 0555 /usr/local/bin/supercronic

USER 65534:65534

CMD ["/usr/local/bin/supercronic", "-passthrough-logs", "/etc/crontab"]
