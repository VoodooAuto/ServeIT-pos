# ServeIT-POS SaaS Platform

A comprehensive multi-tenant Point of Sale system for restaurants with real-time order management, payment processing, and analytics.

## 🏗️ Architecture

**Multi-Tenant SaaS Platform** with three distinct product variants:

### Product Tiers
- **🍔 ServeIT QSR** - Quick Service Restaurant Edition ($49-79/month)
- **🍽️ ServeIT FSR** - Full Service Restaurant Edition ($99-149/month)  
- **☁️ ServeIT CloudKitchen** - Cloud Kitchen Edition ($69-99/month)

## 🚀 Features

### Core Features (All Tiers)
- **Real-time Order Management** - Live order tracking and status updates
- **Payment Processing** - Integrated Paytm gateway with fallback options
- **Inventory Management** - Smart stock tracking with low-stock alerts
- **Kitchen Display System** - Real-time KOT management for kitchen staff
- **Analytics Dashboard** - Comprehensive sales and performance insights
- **Multi-user Support** - Role-based access control (Owner/Admin/Manager/Staff)
- **Thermal Printing** - ESC/POS compatible receipt and KOT printing

### QSR-Specific Features
- **QR Code Ordering** - Contactless table-side ordering
- **Kiosk Mode** - Self-service ordering interface
- **Delivery Integrations** - Zomato, Swiggy, Uber Eats, Dunzo
- **Speed Optimized UI** - Fast-paced service interface

### FSR-Specific Features
- **Table Management** - Floor plan designer and reservation system
- **Waitlist Management** - Queue management for walk-ins
- **Advanced Analytics** - Customer insights and loyalty tracking
- **Multi-location Support** - Centralized management across outlets

### CloudKitchen-Specific Features
- **Multi-Brand Management** - Manage multiple virtual restaurant brands
- **Brand Analytics** - Performance comparison across brands
- **Delivery Optimization** - Partner-specific commission tracking
- **Virtual Brand Creation** - Easy brand duplication and customization

## 🔧 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Firebase Firestore + Cloud Functions
- **Authentication**: Firebase Auth with multi-tenant support
- **Build System**: Vite with optimized production builds
- **Testing**: Vitest + React Testing Library
- **UI Components**: Material-UI + Heroicons
- **Charts**: Recharts for analytics visualization

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js 18+ and npm 8+
- Firebase project with Firestore enabled
- Git for version control

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/serveit-pos.git
   cd serveit-pos
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Firebase Hosting
npm run firebase:deploy
```

## 🌟 Multi-Tenant Architecture

### Feature Flag System
- **40+ Feature Flags** across 7 categories
- **Runtime Feature Control** based on subscription plans
- **A/B Testing Support** for feature rollouts

### Subscription Plans
- **8 Different Plans** with usage limits and feature restrictions
- **Automated Billing** with usage tracking
- **Plan Upgrades/Downgrades** with prorated billing

### Tenant Isolation
- **Firestore Subcollections** for data separation
- **Role-based Access Control** per tenant
- **Custom Subdomains** for brand identity

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## 📦 Deployment

### Docker Deployment
```bash
# Development
npm run docker:dev

# Production
npm run docker:prod
```

### Firebase Deployment
```bash
# Deploy all services
npm run firebase:deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

## 🔒 Security

- **Firebase Security Rules** for data protection
- **Input Validation** with Zod schemas
- **XSS Protection** with DOMPurify
- **Role-based Permissions** at database level
- **Secure Payment Processing** with encrypted tokens

## 📊 Monitoring

- **Real-time Analytics** with Firebase Analytics
- **Error Tracking** with structured logging
- **Performance Monitoring** with Core Web Vitals
- **Uptime Monitoring** with health checks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Firebase team for the robust backend infrastructure
- Material-UI team for the beautiful component library
- React team for the excellent framework
- Vite team for the lightning-fast build system

---

**ServeIT-POS** - Transforming restaurant operations with intelligent automation and real-time insights.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>