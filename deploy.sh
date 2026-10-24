#!/bin/bash

# MediVision Assistant - Cloud Run Deployment Script
# This script deploys the application to Google Cloud Run

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=${PROJECT_ID:-""}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="medivision-assistant"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo -e "${BLUE}🏥 MediVision Assistant - Cloud Run Deployment${NC}"
echo "=================================================="

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: PROJECT_ID environment variable is not set${NC}"
    echo "Please set your Google Cloud Project ID:"
    echo "export PROJECT_ID=your-project-id"
    exit 1
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Service Name: $SERVICE_NAME"
echo "  Image: $IMAGE_NAME"
echo ""

# Step 1: Check if gcloud is installed and authenticated
echo -e "${YELLOW}🔍 Checking Google Cloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI is not installed${NC}"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not authenticated with Google Cloud${NC}"
    echo "Please run: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✅ Google Cloud CLI is ready${NC}"

# Step 2: Set the project
echo -e "${YELLOW}🔧 Setting project...${NC}"
gcloud config set project $PROJECT_ID

# Step 3: Enable required APIs
echo -e "${YELLOW}🔌 Enabling required APIs...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    containerregistry.googleapis.com \
    --quiet

echo -e "${GREEN}✅ APIs enabled${NC}"

# Step 4: Build and push the Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"

# Build with environment variables from .env.local
BUILD_ARGS=""
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📝 Reading environment variables from .env.local for build...${NC}"
    
    # Read environment variables and create build args
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # Extract key=value pairs
        if [[ $line =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]// /}"
            value="${BASH_REMATCH[2]}"
            
            # Add as build arg
            BUILD_ARGS="${BUILD_ARGS} --build-arg ${key}=${value}"
        fi
    done < .env.local
fi

docker build $BUILD_ARGS -t $IMAGE_NAME:latest .

echo -e "${YELLOW}📤 Pushing image to Container Registry...${NC}"
docker push $IMAGE_NAME:latest

echo -e "${GREEN}✅ Image pushed successfully${NC}"

# Step 5: Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"

# Check if .env.local exists for environment variables
ENV_VARS=""
if [ -f ".env.local" ]; then
    echo -e "${BLUE}📝 Found .env.local, processing environment variables...${NC}"
    
    # Read environment variables (excluding comments and empty lines)
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # Extract key=value pairs
        if [[ $line =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
            key="${BASH_REMATCH[1]// /}"
            value="${BASH_REMATCH[2]}"
            
            # Skip sensitive keys that shouldn't be in Cloud Run
            if [[ $key == "NEXTAUTH_SECRET" ]] || [[ $key == "DATABASE_URL" ]]; then
                continue
            fi
            
            if [ -n "$ENV_VARS" ]; then
                ENV_VARS="${ENV_VARS},$key=$value"
            else
                ENV_VARS="$key=$value"
            fi
        fi
    done < .env.local
    
    # Add production-specific variables
    if [ -n "$ENV_VARS" ]; then
        ENV_VARS="${ENV_VARS},NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
    else
        ENV_VARS="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
    fi
else
    echo -e "${YELLOW}⚠️  No .env.local found, using default environment variables${NC}"
    ENV_VARS="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1"
fi

# Deploy with environment variables
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME:latest \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --max-instances 100 \
    --timeout 300 \
    --set-env-vars "$ENV_VARS" \
    --quiet

# Step 6: Get the service URL
echo -e "${YELLOW}🔗 Getting service URL...${NC}"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)')

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📱 Your MediVision Assistant is now live at:${NC}"
echo -e "${GREEN}$SERVICE_URL${NC}"
echo ""
echo -e "${BLUE}📊 Service Details:${NC}"
echo "  Service Name: $SERVICE_NAME"
echo "  Region: $REGION"
echo "  Project: $PROJECT_ID"
echo ""
echo -e "${YELLOW}🔧 Useful Commands:${NC}"
echo "  View logs: gcloud run logs read $SERVICE_NAME --region $REGION"
echo "  Update service: gcloud run services describe $SERVICE_NAME --region $REGION"
echo "  Delete service: gcloud run services delete $SERVICE_NAME --region $REGION"
echo ""
echo -e "${GREEN}✅ Ready for hackathon submission!${NC}"
