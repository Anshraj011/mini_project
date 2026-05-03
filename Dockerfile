FROM eclipse-temurin:17-jdk-jammy AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

COPY src/ src/
COPY frontend/ frontend/
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy

WORKDIR /app
ENV SPRING_PROFILES_ACTIVE=prod

COPY --from=build /app/target/visitor-management-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
