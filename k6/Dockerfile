FROM grafana/k6:latest
COPY --chown=root:root ./load.js ./load.js
ENTRYPOINT ["k6","run","./load.js"]