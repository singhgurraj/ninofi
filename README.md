# NINOFI

**Milestone-Based Escrow & Project Management Platform for Home Renovation**

NINOFI is a mobile-first platform that builds trust between homeowners, contractors, and workers by combining secure payments, digital contracts, verification, and real-time tools for transparent construction management.

---

## 📱 About The Project

NINOFI solves the trust problem in home renovation projects by:
- **Protecting homeowners** with milestone-based escrow (funds released only when work is approved)
- **Guaranteeing contractors** reliable payments upon milestone completion
- **Empowering workers** with fair compensation for completed gigs

### Key Features

- 🔒 **Escrow Protection** - Funds held securely until work is approved
- ✅ **Milestone Tracking** - Break projects into manageable, trackable milestones
- 📸 **Photo Verification** - Document progress with photo uploads
- 📍 **GPS Check-in** - Verify worker presence at job sites
- 💰 **Secure Payments** - Multiple payment methods with instant or bank transfer
- 👤 **Role-Based Dashboards** - Customized experience for Homeowners, Contractors, and Workers
- 📊 **Wallet & Analytics** - Track earnings, spending, and transaction history

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React Native with Expo
- **Navigation:** React Navigation 6.x
- **State Management:** Redux Toolkit with Redux Persist
- **Image Handling:** Expo Image Picker
- **Icons:** React Native Vector Icons
- **HTTP Client:** Axios

### Backend (In Development)
- **Server:** Node.js with Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** AWS S3 / Cloudinary (planned)
- **API Architecture:** RESTful API

---

## 📂 Project Structure
```
ninofi/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.js           
│   ├── screens/
│   │   ├── auth/                     
│   │   │   ├── WelcomeScreen.js
│   │   │   ├── RoleSelectionScreen.js
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── homeowner/                
│   │   │   ├── HomeownerDashboard.js
│   │   │   ├── CreateProjectScreen.js
│   │   │   ├── ProjectDetailsScreen.js
│   │   │   ├── FundProjectScreen.js
│   │   │   └── ReviewMilestoneScreen.js
│   │   ├── contractor/               
│   │   │   ├── ContractorDashboard.js
│   │   │   ├── SubmitMilestoneScreen.js
│   │   │   ├── VerificationScreen.js          
│   │   │   ├── DocumentUploadScreen.js       
│   │   │   └── SelfieVerificationScreen.js    
│   │   ├── worker/                   
│   │   │   └── WorkerDashboard.js
│   │   └── shared/                   
│   │       ├── ProfileScreen.js
│   │       └── WalletScreen.js
│   ├── components/                   
│   │   ├── VerificationBadge.js      
│   │   └── DocumentCard.js          
│   ├── store/
│   │   ├── store.js              
│   │   └── authSlice.js             
│   ├── services/
│   │   ├── api.js                  
│   │   └── auth.js                   
│   └── styles/                       
│       └── palette.js                
├── App.js                            
├── package.json
└── README.md
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation Steps

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/ninofi.git
   cd ninofi
```

2. **Install dependencies**
```bash
   npm install
   # or
   yarn install
```

3. **Install Expo CLI globally (if not already installed)**
```bash
   npm install -g expo-cli
```

4. **Start the development server**
```bash
   npx expo start
```

5. **Run on device**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on physical device

---

## 👥 User Roles

### Homeowner
- Create and manage renovation projects
- Set budgets and define milestones
- Fund projects via escrow
- Review and approve contractor work
- Release payments upon satisfaction

### Contractor
- Browse and apply for projects
- Submit milestone completions with photos
- GPS check-in at job sites
- Receive guaranteed payments
- Track earnings and project history

### Worker
- Browse available gigs nearby
- Apply for construction tasks
- Complete work and get paid
- Build reputation through ratings

---

## 📱 Key Screens

### Authentication Flow
1. **Welcome Screen** - Onboarding with feature highlights
2. **Role Selection** - Choose user type (Homeowner/Contractor/Worker)
3. **Registration** - Sign up with email or social login
4. **Login** - Secure authentication with JWT

### Homeowner Flow
1. **Dashboard** - Project overview, stats, quick actions
2. **Create Project** - 3-step wizard with milestone breakdown
3. **Fund Project** - Escrow deposit with payment options
4. **Project Details** - Progress tracking, milestone status
5. **Review Milestone** - Approve/reject contractor submissions

### Contractor Flow
1. **Dashboard** - Earnings, active projects, payments
2. **Submit Milestone** - Photo upload, GPS check-in, work description
3. **Wallet** - Transaction history, withdrawal options
4. **Profile** - Stats, verification badges, settings

---

## 🎨 Design Decisions

- **Color Scheme:** Blue (#1976D2) for trust and professionalism
- **Layout:** Card-based design for mobile-friendly scanning
- **Typography:** Clear, readable fonts with proper hierarchy
- **Iconography:** Emoji + vector icons for friendly UX
- **Navigation:** Stack-based with role-specific routing
- **Feedback:** Progress indicators, status badges, loading states

---

## ✅ Current Implementation Status

### ✅ Completed (Frontend)
- [x] Authentication flow (Welcome, Role Selection, Login, Register)
- [x] All 3 role-based dashboards
- [x] Project creation with 3-step wizard
- [x] Milestone breakdown and tracking
- [x] Fund project with escrow UI
- [x] Submit milestone with photo upload
- [x] Review & approve milestone workflow
- [x] Profile screen with edit capability
- [x] Wallet with transaction history
- [x] Navigation between all screens
- [x] Redux state management
- [x] Mock API for development

### 🔄 In Progress
- [ ] Node.js/Express backend setup
- [ ] PostgreSQL database schema
- [ ] User authentication API endpoints
- [ ] Project & milestone CRUD APIs
- [ ] File upload to cloud storage

### 🔜 Planned Features
- [ ] Real payment gateway integration (Stripe)
- [ ] Push notifications
- [ ] Real-time messaging
- [ ] Contractor verification (ID upload)
- [ ] Invoice generation (PDF)
- [ ] Dispute resolution system
- [ ] Rating & review system

---

## 🧪 Testing

### Test Accounts (Mock Data)

Create test accounts by registering with these roles:

**Homeowner:**
- Email: `homeowner@test.com`
- Password: `test123`

**Contractor:**
- Email: `contractor@test.com`
- Password: `test123`

**Worker:**
- Email: `worker@test.com`
- Password: `test123`

### Testing User Flows

1. **Complete Project Flow (Homeowner)**
   - Register → Create Project → Fund Project → Review Milestone → Approve

2. **Milestone Submission (Contractor)**
   - Register → Browse Projects → Submit Milestone → Upload Photos → GPS Check-in

3. **Gig Workflow (Worker)**
   - Register → Browse Gigs → Apply → View Wallet

---

## 🤝 Contributing

This is a course project for CS407 Mobile App Development at UW-Madison.

**Team Members:**
- **Gurraj Singh** (gsingh62@wisc.edu)
- **Kunal Singh** (kdsingh@wisc.edu) 
- **Arjun Bharadhwaj** (bharadhwaj@wisc.edu) 
- **Rohit Sriram** (rsriram2@wisc.edu) 

---

## 📅 Project Milestones

### Milestone 1 (October 27) ✅
- Main app layout with login and role selection
- Basic project and milestone creation
- Simple contractor/homeowner workflow

### Milestone 2 (November 10) ✅ (Frontend Complete)
- Funding milestones UI
- Photo upload functionality
- Approve/reject workflow
- Full project flow with test data

### Milestone 3 (November 24) 🔄
- Contractor verification (ID checks, GPS)
- Invoice generation
- Admin panel for testing

### Milestone 4 (December 8) 🔜
- Dispute process
- Rating system
- Final polish and bug fixes
- Demo preparation

---

## 🐛 Known Issues

- Mock API doesn't persist data between app restarts (backend will fix this)
- Photo uploads currently stored locally (will move to cloud storage)
- Payment processing is UI-only (integration with Stripe planned)
- GPS check-in is simulated (real location tracking coming)

---

**Project Repository:** [[GitHub Link]](https://github.com/singhgurraj/ninofi)

---

## 🙏 Acknowledgments

- **User Feedback:** Antonio R. (Contractor) and Mukesh P. (Homeowner)

---

## 🚀 Future Enhancements

- Multi-language support
- Dark mode
- AI-powered project estimation
- Contractor marketplace
- Insurance integration
- Progress timeline visualization
- Voice notes for milestone updates
- Video call integration for consultations

---

**Built with ❤️ by Team NINOFI**

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
