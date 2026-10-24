#!/usr/bin/env node

/**
 * Google Cloud Platform Setup Script
 * Automates the setup of GCP services for MediVision Assistant
 */

const { execSync } = require("child_process")

const PROJECT_ID = process.env.GCP_PROJECT_ID || "medivision-assistant"
const REGION = "us-central1"
const SERVICE_NAME = "medivision-assistant"

console.log("🚀 Setting up Google Cloud Platform for MediVision Assistant...\n")

try {
  // Enable required APIs
  console.log("📡 Enabling required APIs...")
  execSync(`gcloud services enable cloudbuild.googleapis.com --project=${PROJECT_ID}`, { stdio: "inherit" })
  execSync(`gcloud services enable run.googleapis.com --project=${PROJECT_ID}`, { stdio: "inherit" })
  execSync(`gcloud services enable containerregistry.googleapis.com --project=${PROJECT_ID}`, { stdio: "inherit" })

  // Create Cloud Build trigger
  console.log("\n🔧 Setting up Cloud Build trigger...")
  execSync(
    `gcloud builds triggers create github \
    --repo-name=medivision-assistant \
    --repo-owner=your-github-username \
    --branch-pattern="^main$" \
    --build-config=cloudbuild.yaml \
    --project=${PROJECT_ID}`,
    { stdio: "inherit" },
  )

  // Set up IAM permissions
  console.log("\n🔐 Configuring IAM permissions...")
  execSync(
    `gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
    --role="roles/run.developer"`,
    { stdio: "inherit" },
  )

  console.log("\n✅ GCP setup completed successfully!")
  console.log(`\n📋 Next steps:
  1. Set your Google AI Studio API key in Cloud Run environment variables
  2. Update the GitHub repository name in the Cloud Build trigger
  3. Push to main branch to trigger deployment
  4. Access your app at: https://${SERVICE_NAME}-${REGION}-${PROJECT_ID}.a.run.app`)
} catch (error) {
  console.error("❌ Setup failed:", error.message)
  process.exit(1)
}
