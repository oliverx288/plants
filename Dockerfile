# --- build ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

# --- run ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd --system --create-home savia && mkdir -p /app/uploads && chown -R savia:savia /app
USER savia
COPY --from=build /build/target/savia.jar app.jar
ENV UPLOAD_DIR=/app/uploads
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
