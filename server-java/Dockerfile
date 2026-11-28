# Stage 1: build the jar
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src src
RUN ./mvnw -B -q package -DskipTests \
 && java -Djarmode=tools -jar target/app.jar extract --destination /app

# Stage 2: small runtime image with a class-data archive for faster start.
# The flags below are for a very small CPU (Render free): measured about 4x faster wake-up.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app ./
RUN java -XX:ArchiveClassesAtExit=app.jsa -Dspring.context.exit=onRefresh -jar app.jar > /dev/null
RUN useradd --system app
USER app
EXPOSE 8080
ENTRYPOINT ["java", \
  "-XX:SharedArchiveFile=app.jsa", \
  "-XX:TieredStopAtLevel=1", \
  "-XX:+UseSerialGC", \
  "-Xss512k", \
  "-XX:MaxRAMPercentage=60", \
  "-Dspring.main.lazy-initialization=true", \
  "-jar", "app.jar"]
