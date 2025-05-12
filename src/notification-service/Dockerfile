FROM node:18-alpine

WORKDIR /app


RUN apk --no-cache add curl


COPY . .


RUN npm install


RUN mkdir -p /app/logs
RUN touch /app/logs/notification-service.log


ENV NODE_ENV=production
ENV PORT=3004
ENV HOST=0.0.0.0
ENV KAFKA_BROKERS=kafka:9092
ENV KAFKA_TOPIC=order-events
ENV EMAIL_SERVICE=mailjet
ENV EMAIL_HOST=in-v3.mailjet.com
ENV EMAIL_PORT=587
ENV EMAIL_USER=018cd022d998484178167bd4e2ed76ae
ENV EMAIL_FROM=amine.ouhiba@polytechnicien.tn
ENV ADMIN_EMAIL=amibz2001@gmail.com
ENV EMAIL_PASSWORD=cc2e938b41484c50b9e995fbe1e94882


EXPOSE 3004


CMD ["node", "src/index.js"]