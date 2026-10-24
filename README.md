# 🏥 MediVision Assistant

### AI-Powered Healthcare Companion

> **Advanced multimodal AI healthcare assistant** designed for elderly and disabled users with comprehensive health monitoring and accessibility features.

## 🎯 **The Problem**

- **73% of elderly users** struggle with complex healthcare apps
- **Fragmented health data** leads to poor care coordination
- **Accessibility barriers** prevent disabled users from accessing digital health tools
- **Limited multimodal input** options for health monitoring

## 💡 **Our Solution**

**MediVision Assistant** - An AI-powered healthcare companion that makes medical assistance accessible to everyone, especially those with visual impairments or accessibility needs.

### **🔥 Key Features**

#### 🤖 **Advanced Multimodal AI**

- **AI Skin Analysis** - Upload photos and videos for instant skin condition assessment
- **AI Health Infographics** - Generate professional medical infographics using advanced AI image generation
- **Voice Symptom Logger** - Record and transcribe health symptoms using speech-to-text
- **Medication Scanner** - OCR-powered medication identification and management
- **AI Health Chat** - Conversational AI for health questions and guidance
- **Seamless Analysis-to-Chat Integration** - Continue conversations with AI based on analysis results

#### ♿ **Accessibility-First Design**

- **Full Accessibility Support** - Voice navigation, screen reader compatibility, high contrast mode
- **Voice navigation** and screen reader optimization
- **High contrast modes** and font scaling
- **Keyboard-only navigation** support
- **Simple, large UI elements** for motor impairments

#### 📱 **Progressive Web App (PWA)**

- **Progressive Web App** - Works offline, installable on any device
- **Installable on any device** (phone, tablet, desktop)
- **Background sync** for health data
- **Native app experience** without app stores

---

## ⚡ **Core Features**

### 🔍 **Smart Health Analysis**

| Feature                 | Description                                        | AI Model         |
| ----------------------- | -------------------------------------------------- | ---------------- |
| **Skin Analysis**       | Analyze photos of skin conditions, rashes, wounds  | Gemini 2.5 Flash |
| **Video Analysis**      | Analyze health videos for movement, posture, gait  | Gemini 2.5 Flash |
| **Medication Scanner**  | Identify pills, check interactions, verify dosages | Gemini 2.5 Flash |
| **Health Infographics** | AI-generated medical visual content and schedules  | Imagen 4.0       |
| **Voice Logger**        | Process voice descriptions of symptoms             | Gemini 2.5 Flash |
| **Health Chat**         | Intelligent health conversations with context      | Gemini 2.5 Flash |

### 📊 **Health Data Management**

- **Secure Storage**: HIPAA-compliant data handling with Supabase
- **Conversation History**: Persistent chat records with analysis
- **Health Statistics**: Track symptoms, medications, vital signs over time
- **Export Data**: Download health records in multiple formats
- **Data Insights**: AI-powered trend analysis and recommendations

### 🌐 **Accessibility & PWA**

- **Voice Commands**: Complete app navigation using voice commands
- **Offline Mode**: Cached data work without internet
- **Install Anywhere**: Works on phones, tablets, computers as native app
- **Background Sync**: Data syncs automatically when connection restored

---

## 🛠 **Tech Stack**

### **Frontend**

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide Icons** - Accessible icon system

### **AI & APIs**

- **Google Gemini 2.5 Flash** - Advanced LLM for health analysis
- **Google Imagen 4.0** - AI-generated health infographics
- **Google Live API** - Real-time streaming responses
- **Web Speech API** - Voice recognition and synthesis
- **MediaDevices API** - Camera and microphone access

### **Backend & Data**

- **Supabase** - PostgreSQL database, authentication, storage
- **Vercel** - Serverless deployment and analytics
- **PWA Service Worker** - Offline functionality and caching

---

## 📱 **Screenshots**

### Screenshots

Homepage Dashboard: Clean, accessible dashboard with health summary and quick actions
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/t953kyqweffpg7wdiflt.png)

Skin Analysis: AI-powered skin condition analysis with detailed insights
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/yul1vb2f6ib37v4trlt6.png)
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/npe4ggha14r85n3j9ukw.png)

Voice Logger: Voice-to-text symptom recording with transcription
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qk52jt47yn8puwqycm2r.png)
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/qfq5rbes56r917w1vhtm.png)

Health Chat: Conversational AI for health questions
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/u589w00ngr8cu5upwl8w.png)

AI Health Infographics: Professional medical infographics

![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/enhn887x4299iredieec.png)
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/kylaxqh1cc68u6k7b8sn.png)

Health Records
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/3l9y96zckvbavb7fowvx.png)

Accessibility Features: Comprehensive accessibility toolbar with voice navigation
![Image description](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/0dayoklfqjd6hgkwki6r.png)

---

## 🚀 **Quick Start**

### **1. Clone & Install**

```bash
git clone https://github.com/acorn266/CareLens-AI
cd CareLens-AI
npm install
```

### **2. Environment Setup**

```bash
# Copy environment template
cp .env.example .env.local

# Add your API keys:
GOOGLE_AI_API_KEY=your_gemini_api_key
GCP_PROJECT_ID=your_gcp_project_id
CUSTOM_KEY=your_custom_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=https://medivision.yourdomain.com
```

### **3. Database Setup**

```bash
# Set up Supabase database using the provided SQL schema
# Import the supabase-schema.sql file into your Supabase project
# This will create all necessary tables for health records, conversations, and user data
# The schema includes proper RLS policies and triggers for data security
```

### **4. Development**

```bash
npm run dev
# Open http://localhost:3000
```

### **5. PWA Testing**

```bash
# Build for production
npm run build

# Test PWA features locally
npm start
```

---

## 🧪 **Demo Instructions**

### **🎭 For Demo/Review:**

1. **Skin Analysis**: Upload a photo → See AI medical analysis with confidence scores
2. **Voice Commands**: Use voice navigation → Experience accessibility features
3. **Health Chat**: Ask health questions → Get AI-powered responses
4. **PWA Install**: Click browser install prompt → Use as native app
5. **Voice Logger**: Record symptoms → See transcription and analysis

### **🔥 Key Features to Highlight:**

- **Multimodal AI analysis** with image, video, and voice processing
- **Accessibility-first design** with voice navigation and screen reader support
- **Progressive Web App** with offline functionality
- **Voice accessibility** with natural language commands
- **Professional medical UI** with comprehensive health monitoring

### **Competitive Advantage**

✅ **Only solution** combining multimodal AI with accessibility-first design  
✅ **Real-time streaming analysis** vs batch processing competitors  
✅ **PWA deployment** = zero app store friction  
✅ **Open source friendly** vs proprietary closed systems

---

## 🏆 **What Makes This Project Stand Out**

### **Technical Excellence**

- **Advanced AI Integration**: Latest Gemini 2.5 models with streaming
- **Real-time Intelligence**: Emergency detection during live conversation
- **Production-Ready**: PWA with offline functionality and background sync
- **Accessibility Leadership**: Voice-first design with full WCAG compliance

### **Social Impact**

- **Inclusivity Focus**: Built for underserved elderly and disabled communities
- **Healthcare Access**: Breaks down barriers to digital health tools
- **Family Peace of Mind**: Caregivers get comprehensive health monitoring
- **Accessibility Leadership**: Voice-first design with full WCAG compliance

### **Innovation Factor**

- **First-of-its-kind**: Multimodal AI healthcare companion with accessibility focus
- **Advanced AI Integration**: Latest multimodal models for comprehensive health analysis
- **Cross-platform PWA**: Works everywhere without app stores
- **Open Development**: Extensible architecture for future enhancements


