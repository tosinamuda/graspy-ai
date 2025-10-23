# graspy - AI Tutor for Out-of-School Children

<div align="center">

**Providing personalized, culturally-aware education to 244 million out-of-school children in crisis zones, IDP camps, and underserved communities worldwide.**

</div>

---

## 📖 Overview

graspy is an AI-powered educational platform designed to deliver quality education to displaced and underserved children worldwide. The platform generates personalized learning curricula adapted to each student's native language, cognitive level, and cultural context—ensuring that education remains accessible even in the most challenging circumstances.

**Key Features:**

- 🌍 **Multi-language Support**: Native language learning (Arabic, Hausa, Yoruba, Pashto, etc.)
- 🎯 **Adaptive Curriculum**: AI-generated personalized learning paths using Agentic AI through AWS Strands
- 📚 **Culturally Relevant**: Context-aware examples (local currency, food, scenarios)
- 💬 **AI Tutor Chat**: Real-time Q&A with Socratic teaching methods
- 🔌 **Offline-First**: Local storage for continued learning without internet
- ♿ **Accessible**: Mobile-first design with RTL language support

---

## 🎯 Why Graspy?

### The Problem

- **244 million children** are out of school globally
- Crisis zones, IDP camps, and underserved communities lack educational infrastructure
- Traditional one-size-fits-all curricula don't account for displaced children's varied educational backgrounds
- Language barriers prevent learning in unfamiliar languages
- Intermittent internet access in crisis zones

### Our Solution

- **AI-powered personalized curriculum generation** tailored to each student's level
- **Culturally and linguistically appropriate content** in native languages
- **Offline-first architecture** for unreliable connectivity
- **Free, accessible education** for all
- **Adaptive learning** that meets students at their actual cognitive level

---

## 🤖 AI Integration & Architecture

### How Graspy Generates Personalized Curricula

Graspy uses **AWS Strands** (Agentic AI framework) with **Amazon Bedrock** to orchestrate multi-agent workflows for intelligent curriculum generation:

#### 1. **AWS Bedrock** - LLM Inference Platform

- **Purpose**: Serverless LLM inference with enterprise security
- **Model**: Amazon Nova Lite (`amazon.nova-lite-v1:0`)
- **Features**:
  - Low latency inference
  - Multi-language support
  - Cost-effective for educational use
  - Server-Sent Events (SSE) for streaming responses

#### 2. **AWS Strands** - Agentic AI Framework

- **Purpose**: Multi-agent workflow orchestration for curriculum generation
- **Agents**:
  - **Curriculum Designer Agent**: Creates personalized learning paths
  - **Content Generator Agent**: Generates culturally-aware lesson content
  - **Assessment Builder Agent**: Creates practice exercises and quizzes
- **Features**:
  - Async agent coordination
  - Context-aware content generation
  - Adaptive learning path optimization

#### 3. **Real-time Streaming**

- **Technology**: Server-Sent Events (SSE) via `sse-starlette`
- **Purpose**: Stream curriculum generation in real-time to frontend
- **User Experience**: Progressive rendering of lessons as they're generated

### Why This Architecture?

1. **Scalability**: Serverless Bedrock scales automatically
2. **Cost-Effective**: Pay only for what you use
3. **Low Latency**: Amazon Nova Lite is optimized for fast responses
4. **Agentic Intelligence**: Strands orchestrates complex multi-step workflows
5. **Streaming UX**: Users see content as it's generated, not after everything completes
6. **Offline-First**: Frontend caches generated curricula locally

---

## 🎓 Post-MVP Roadmap

### Phase 1: Enhanced Features (Q4 2025)

- [ ] User authentication
- [ ] More curriculum support
- [ ] Adaptive curriculum (AI-recommended remedial topics)
- [ ] Parent dashboard (read-only progress view)
- [ ] Study streak tracker
- [ ] Launch

### Phase 2: Platform Expansion (Q1 2026)

- [ ] Teacher dashboard with class management
- [ ] Peer-to-peer study groups
- [ ] Video content integration
- [ ] Mobile native apps (React Native)
- [ ] Voice input for chat (Web Speech API)

### Phase 3: Scale & Impact (Q2 2026)

- [ ] Offline content packages (USB distribution)
- [ ] SMS-based progress notifications
- [ ] Multi-modal learning (audio lessons)
- [ ] Gamification and achievements
- [ ] Partnership with NGOs and UNHCR

### Long-term Vision

- **1M+ Students**: Reach 1 million displaced children by 2026
- **50+ Languages**: Expand to all major languages in crisis zones
- **Offline Mesh Networks**: Peer-to-peer content sharing via Bluetooth/WiFi Direct
- **AI Voice Tutors**: Multi-lingual voice-based tutoring
- **Credential Pathways**: Recognized certificates for students

---

## 🌟 Support the Project

If you find Graspy helpful, please:

- ⭐ Star the repository
- 🐛 Report bugs and issues
- 💡 Suggest new features
- 📖 Improve documentation
- 🌍 Spread the word about accessible education

---

## 📧 Contact & Community

- **Repository**: [github.com/tosinamuda/graspy](https://github.com/tosinamuda/graspy)
- **Issues**: [Report a bug or request a feature](https://github.com/tosinamuda/graspy/issues)

---

<div align="center">

**Made with ❤️ for 244 million out-of-school children worldwide**

*Education is a right, not a privilege.*

</div>
