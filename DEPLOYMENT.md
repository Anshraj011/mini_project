# Deployment

This app deploys as one Spring Boot web service. The frontend in `frontend/` is copied into the jar and served by Spring Boot, so the browser calls `/api` on the same deployed host.

## Render

1. Push this project to a GitHub repository. Do not commit `.env`.
2. In Render, create a new Blueprint from the repository. Render will read `render.yaml`.
3. Add the secret environment variables Render asks for:
   - `MONGO_URI`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `EMAIL_FROM`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
4. Deploy the service.

If your production database is empty, you can temporarily set `VMS_SEED_ENABLED=true` for the first deploy to create demo users, then remove it immediately. The seeder clears existing users before inserting demo users, so keep it off for real production data.

## Local production build

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21'
.\mvnw.cmd clean package -DskipTests
java -Dspring.profiles.active=prod -jar target\visitor-management-0.0.1-SNAPSHOT.jar
```

For production, rotate any credentials that were previously committed or shared locally before making the repository public.
