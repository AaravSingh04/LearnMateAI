BEGIN TRANSACTION;
CREATE TABLE calendar_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    event_type TEXT NOT NULL DEFAULT 'exam',
                    event_date TEXT NOT NULL,
                    event_time TEXT,
                    subject_id INTEGER,
                    notes TEXT,
                    reminder_offset_days INTEGER DEFAULT 1,
                    is_completed INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
                );
INSERT INTO "calendar_events" VALUES(5,'MID TERM','exam','2026-11-12',NULL,NULL,NULL,1,0,'2026-11-04 18:53:56');
CREATE TABLE materials (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_id INTEGER NOT NULL,
                    original_filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    file_type TEXT NOT NULL,
                    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
                    extracted_text TEXT NOT NULL DEFAULT '',
                    processing_status TEXT NOT NULL DEFAULT 'completed', self_notes TEXT DEFAULT '',
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                );
INSERT INTO "materials" VALUES(4,3,'session 1- Introduction.pptx','d6401fe1ffc24267a382dd5d47958c14.pptx','.pptx','2026-10-29 19:55:14','--- Slide 1 ---
Managerial Economics
Gopal Naik,
Professor, Economics and Social Sciences

--- Slide 2 ---
What are the key decisions made by the product managers?
Design of the product?
What features? Profitability?
What size?
What packaging?
Production?
How much?
Where to sell?
What market?
What segment?
What promotion?
What Price?

--- Slide 3 ---
What Inputs are Needed to Make these Decisions?
Product Development
What consumers want?
Segment size?
Profitability?
Production facility
Technology of production?
Capacity?
Resources?

--- Slide 4 ---
Market
Market
Structure
Conduct
Competition
Regulation
Policy

--- Slide 5 ---
Markets
Demand – major factors affecting demand
What type of change in the demand?
How are consumer preferences and behaviour changing?
Supply – major factors affecting supply
Market structure – number of players, how they compete
Domestic and International Markets

--- Slide 6 ---
Analysis of related markets
Input market
Supply
Demand
By-product market
Substitute Products markets

--- Slide 7 ---
Government Policies
Import – export policies
Taxes, subsidies
Experiences of other countries

--- Slide 8 ---
Risks and Uncertainty
Changing prices
Changing supply
Changing demand

--- Slide 9 ---
9
Circular-Flow Model of the Economy
Households
- supply resources
- demand goods and services
Firms
- supply goods and services
- demand resources
Money flows in resource markets determine wages, interest, rents and profits.
Money flows as income to households
Product markets determine the prices for goods and services.
This flows as revenue to firms (source: Dale Bails)

--- Slide 11 ---
Fundamentals of Economic Activity
Managerial economics deals with limits
Limited budgets
Limited time
Limited ability to produce
How do we make the most of limits?
How do we allocate scarce resources?

--- Slide 12 ---
Themes of Managerial Economics
Consumers
Limited incomes
Consumer theory – describes how consumers maximize their well-being, using their preferences, to make decisions about trade-offs
How do consumers make decisions about consumption and savings?

--- Slide 13 ---
Themes of Microeconomics
Firms
What types of products do firms produce?
Constraints on production capacity and financial resources create trade-offs
Theory of the Firm – describes how these trade-offs are best made

--- Slide 14 ---
Themes of Microeconomics
Prices
Trade-offs are often based on
prices faced by consumers and producers
Workers make decisions based on
prices for labor – wages
Firms make decisions based on
wages
prices for inputs and
prices for the goods they produce

--- Slide 15 ---
Themes of Microeconomics
Prices
How are prices determined?
Centrally planned economies – governments control prices
Market economies – prices determined by interaction of market participants
Markets – collection of buyers and sellers whose interaction determines the prices of goods

--- Slide 16 ---
What is a Market?
Market Definition
Determination of the buyers, sellers, and range of products that should be included in a particular market

--- Slide 17 ---
What is a Market?
Functioning of the Market
Most interesting questions in economics is concerned with the functioning of markets
Why are there a lot of firms in some markets and not in others?
Are consumers better off with many firms?
Should the government intervene in markets?

--- Slide 18 ---
Types of Markets
Perfectly competitive markets
Because of the large number of buyers and sellers, no individual buyer or seller can influence the price
Example: Most agricultural markets
Fierce competition among firms can create a competitive market

--- Slide 19 ---
Types of Markets
Noncompetitive Markets
Markets where individual producers can influence the price
Electricity market
Cartels – groups of producers who act collectively
Example: OPEC dominates with world oil market

--- Slide 20 ---
Market Price
Transactions between buyers and sellers are exchanges of goods for a certain price
Market price – price prevailing in a competitive market
Some markets have one price: price of gold
Some markets have more than one price:
Detergents - price of nirma versus wheel

--- Slide 21 ---
Theories and Models
Economics is concerned with explanation of observed phenomena
Theories are used to explain observed phenomena in terms of a set of basic rules and assumptions:
The Theory of the Firm
The Theory of Consumer Behavior

--- Slide 22 ---
Theories and Models
Theories are used to make predictions
Economic models are created from theories
Models are mathematical representations used to make quantitative predictions

--- Slide 23 ---
Positive & Normative Analysis
Positive Analysis – statements that describe the relationship of cause and effect
Questions that deal with explanation and prediction
What is the impact of AI on the growth of service sectors?
What is the impact of an increase in the fuel excise tax?

--- Slide 24 ---
Positive & Normative Analysis
Normative Analysis – analysis examining questions of what ought to be
Often supplemented by value judgments
Should the government go for prohibition?
What should be the minimum wages for unskilled laborer?
What should be the speed limits on highways?

--- Slide 25 ---
Real Versus Nominal Prices
Comparing prices across time requires measuring prices relative to some overall price level
Nominal price is the absolute or current Re price of a good or service when it is sold
Real price is the price relative to an aggregate measure of prices or constant Re price

--- Slide 26 ---
Real Versus Nominal Prices
Consumer Price Index (CPI) is often used as a measure of aggregate prices level
Records the prices of a large market basket of goods purchased by a “typical” consumer over time
Percent changes in CPI measure the rate of inflation

--- Slide 27 ---
Real Versus Nominal Prices
Calculating Real Prices

--- Slide 28 ---
Real Versus Nominal Prices
Nominal Price – Absolute price of a good unadjusted for inflation
Price of rice Rs 7/kg in 2000-01 and in 2019-20 price is Rs 40/kg
Consumer price index – measure of aggregate price level
2000-01  - base 100; 2019-20 - 800
Real Price is price of a good relative to an aggregate measure of prices, price adjusted for inflation
at 2000-01 prices for 2019-20 – (100/800*40)

--- Slide 29 ---
Milk Price paid by Mysore Milk Union to Farmers

--- Slide 30 ---
Course Objectives
To analyze firm-level economic problems and understand their consequences, to compare alternative solutions to these problems, to understand the market and regulatory environment in which they operate, and to take informed and appropriate decisions subject to various constraints and targets.
To help product managers to identify right markets, product features and understand the characteristics of the market they are operating in and take appropriate decision regarding product and pricing

--- Slide 31 ---
Focus of the course
Market mechanism
Consumer behaviour
Firm behaviour
Market structure, Conduct and Performance

--- Slide 32 ---
Module 1: Demand and Supply
Module provides an understanding of basic determinants of demand and supply, the nature of demand and supply curves and their interaction in the market, and important concepts such as price elasticity of demand and supply and market equilibrium. Relevance of these concepts for product managers is discussed.

--- Slide 33 ---
Module 2: Consumer Demand and Demand Estimation
Module acquaints students with the basic concepts and theories relating to consumer behavior under certainty. It introduces important concepts such as maximization of utility, budget constraints, preferences, and indifference curves. It explains how consumer preferences can be elicited and can be used as an important input in product development situations. The link between consumer theory and demand curves is also explained. Methods of empirically estimating demand are discussed

--- Slide 34 ---
Module 3: Theory of Firm and Market Structure
The focus of this module is to explain the main concepts and tools pertaining to production theory. These include a wide range of concepts, such as, total and marginal product, diminishing returns, input substitution, choice of optimal input combinations, returns to scale, costs, revenues, profits, and short run and long run decision making by firms. The link between production theory and the supply curve is explained. This module also covers different types of markets, including, perfect competition, monopoly, oligopoly, and monopolistic competition and their characteristics.

--- Slide 35 ---
Module 4: Firm Behaviour, Pricing and Game Theory
The module highlights the sources of differences in these various market structures and the implications for firm and industry output, prices, efficiency, and profits. In the course of discussing these different market structures, the module also touches upon important topics such as pricing strategies of firms, strategic and game-theoretic aspects of firm behavior, cartels and collusion, and competition policies

--- Slide 36 ---
Evaluation
Class Participation -20%
Midterm exam – 30%
Term Paper and Presentation – 50%
Individual – 10%
Group – 40%','completed','');
INSERT INTO "materials" VALUES(6,4,'PM2-Tech-Stacks-Guide.pptx','28dd980bb0714aeaa4173fec5a747a1a.pptx','.pptx','2026-11-04 18:52:20','--- Slide 1 ---
PRODUCT MANAGEMENT II  ·  TECH STACKS
Technology Stacks Guide
A PM''s comprehensive reference to the modern technology landscape

--- Slide 2 ---
CHAPTER 1
What Is a Tech Stack?
A tech stack is the combination of technologies used to build and run a software product — programming languages, frameworks, databases, cloud services, and tools.
THE FOUR LAYERS OF A TECH STACK
Frontend
What users see
HTML, CSS, React,
Vue, Angular
Backend
Business logic
Python, Java,
Node.js, .NET
Database
Where data lives
PostgreSQL, MongoDB,
Redis
Infrastructure
Where it runs
AWS, Azure, GCP,
Docker, K8s
WHY PMs MUST UNDERSTAND TECH STACKS
Feasibility
Know what''s realistic
for your team to build
Timelines
Stack choices directly
affect time-to-market
Cost
Licensing, hosting,
and hiring costs vary
Hiring
Stack determines which
engineers you can recruit
PM
PM IMPLICATION
You don''t pick the stack — engineering does. But you must speak the language, understand trade-offs, ask the right questions, and make informed product decisions.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 3 ---
CHAPTER 2
Frontend Technologies — What Users See
THE FOUNDATION: HTML + CSS + JAVASCRIPT
HTML
Structure of every
web page (content)
CSS
Styling and layout
(colors, fonts, spacing)
JavaScript
Interactivity and logic
(clicks, animations, data)
FRONTEND FRAMEWORKS — WHICH TO USE?
Framework | Language | Best For | Used By
React | JavaScript/TS | Most web UIs, interactive SPAs | Facebook, Netflix, Airbnb
Next.js | JavaScript/TS | Full-stack React (SSR + CSR) | Vercel, TikTok, Hulu
Vue.js | JavaScript/TS | Progressive enhancement, Asia market | Alibaba, GitLab, Nintendo
Angular | TypeScript | Large enterprise apps, strict structure | Google, Microsoft, Forbes
Svelte | JavaScript/TS | Performance-critical, lightweight | Apple, Spotify, NYTimes
CSS FRAMEWORKS & TOOLS
Tailwind CSS
Utility-first CSS
Most popular 2024+
Bootstrap
Component library
Quick prototyping
Material UI
Google''s design system
React components
Shadcn/ui
Copy-paste components
Tailwind + React
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 4 ---
CHAPTERS 3–7
Backend Languages at a Glance
The backend is the "brain" of your application — it processes data, runs business logic, and serves APIs.
Language | Created | Primary Use | Killer Feature | Avoid For
Python | 1991 | AI/ML, data science, web | Ecosystem breadth, AI dominance | Mobile apps, high concurrency
JavaScript | 1995 | Web frontend + Node.js backend | Runs everywhere (browser+server) | CPU-intensive computation
TypeScript | 2012 | Superset of JS with static types | Type safety across full stack | Quick prototypes (types slow down)
Java | 1995 | Enterprise backend, Android | JVM maturity, enterprise ecosystem | Rapid prototyping
C# / .NET | 2000 | Windows, enterprise web, games | Microsoft ecosystem integration | Linux-native teams w/o .NET exp
Go | 2009 | High-perf APIs, infrastructure | Goroutines; single binary; fast startup | Feature-rich business apps
Rust | 2015 | Systems programming, WebAssembly | Memory safety without GC | Most web applications
PHP | 1994 | Web (WordPress, Laravel) | Powers 43% of web; Laravel elegance | High-performance APIs
Ruby | 1995 | Web (Rails) | Developer happiness; Rails convention | High concurrency at scale
Kotlin | 2011 | Android, JVM backend | Java interop; conciseness | Large existing Java teams
PM
PM IMPLICATION
Most startups in 2024+ pick Python (AI/ML backend) or TypeScript/Node.js (full-stack JavaScript). Enterprise still runs Java and C#. The "best" language depends on your team and problem.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 5 ---
BACKEND DECISION GUIDE
When to Use Which Language
MATCH THE LANGUAGE TO THE JOB
Use Case | Best Language(s) | Why
AI / Machine Learning product | Python | TensorFlow, PyTorch, scikit-learn all Python-first
Full-stack web startup (small team) | TypeScript / Node.js | One language front + back; huge npm ecosystem
Enterprise B2B SaaS | Java (Spring Boot) or C# (.NET) | Mature, battle-tested, strong hiring pool
High-performance APIs / microservices | Go or Rust | Fast execution, low memory, great for infra
Content site / CMS / e-commerce | PHP (Laravel) or Ruby (Rails) | WordPress powers 43% of web; Rails is fast to build
Android mobile app | Kotlin (or Java) | Official Android language; full Google support
Data pipelines / scripting | Python | Pandas, NumPy, Airflow — unmatched data ecosystem
KEY PM INSIGHT: IT''S ABOUT THE TEAM, NOT THE LANGUAGE
Hiring Market Matters
Python & JS developers are abundant.
Go & Rust talent is scarce and expensive.
Stack choice = recruiting strategy.
Migration Is Expensive
Rewriting from Python to Go costs
6-18 months. Pick wisely upfront.
Most companies never rewrite.
PM
PM IMPLICATION
Instagram runs Python (Django) at massive scale. Twitter moved from Ruby to Java/Scala as they scaled. The right language is the one your team knows — optimize later.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 6 ---
CHAPTER 8
Mobile Development Approaches
FOUR WAYS TO BUILD MOBILE APPS
Native iOS
(Swift)
Best performance
Full Apple APIs
Expensive: iOS only
Native Android
(Kotlin)
Best performance
Full Google APIs
Expensive: Android only
React Native
(JavaScript)
One codebase, both
platforms. Used by
Meta, Shopify, Discord
Flutter
(Dart)
Google''s toolkit.
Beautiful UIs. Used by
Google Pay, BMW, eBay
CROSS-PLATFORM vs NATIVE — THE TRADE-OFF
Factor | Native (Swift/Kotlin) | Cross-Platform (RN/Flutter) | PWA (Web App)
Performance | Best (100%) | Very good (90-95%) | Good (80-85%)
Development cost | 2x (two codebases) | 1x (shared code) | 0.5x (just a website)
Time to market | Slow (build twice) | Fast (build once) | Fastest
App Store access | Yes | Yes | No (runs in browser)
Best for | Gaming, AR, complex UX | Most business apps | Content, simple tools
PM
PM IMPLICATION
80% of new mobile apps in 2024+ use cross-platform (React Native or Flutter). Go native only if you need cutting-edge device features. PWAs work great for emerging markets with low storage.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 7 ---
CHAPTER 9
Database Technologies
RELATIONAL (SQL) vs NON-RELATIONAL (NoSQL)
Relational Databases (SQL)
Structured tables with rows & columns. ACID-compliant — guaranteed consistency.
PostgreSQL  —  Default choice for most apps
MySQL  —  Web apps, WordPress, PHP
SQL Server  —  Microsoft/Azure enterprise
Oracle DB  —  Mission-critical, banking
SQLite  —  Embedded, mobile, local dev
NoSQL Databases
Flexible schemas, horizontal scaling. Optimized for specific data patterns.
MongoDB  —  Document store, flexible schemas
Redis  —  In-memory cache, sessions, queues
Cassandra  —  Billions of writes/day, IoT
Neo4j  —  Graph DB: social, recommendations
Pinecone  —  Vector DB for AI/RAG search
NEWER CATEGORIES
NewSQL
SQL + horizontal scale
CockroachDB, Spanner
Time-Series
Metrics & IoT data
InfluxDB, TimescaleDB
Vector DBs
AI semantic search
Pinecone, pgvector
Serverless DBs
Scale to zero, pay-per-query
Neon, PlanetScale, Turso
PM
PM IMPLICATION
Default to PostgreSQL for most apps. Add Redis for caching, MongoDB if schema flexibility matters, and a vector DB if building AI features. Most apps need just 1-2 databases.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 8 ---
CHAPTER 10
Cloud Platforms & Services
THE BIG THREE — MARKET SHARE 2024
AWS (Amazon)
~31% share · 200+ services
Most widely used globally
Azure (Microsoft)
~24% share · Enterprise focus
Best for Microsoft shops
GCP (Google)
~12% share · AI/data leader
BigQuery, Vertex AI, TPUs
CLOUD SERVICES COMPARISON — KEY CATEGORIES
Category | AWS | Azure | GCP
Virtual Machines | EC2 | Virtual Machines | Compute Engine
Serverless Functions | Lambda | Azure Functions | Cloud Functions
Object Storage | S3 | Blob Storage | Cloud Storage
Managed Database | RDS / Aurora | Azure Database | Cloud SQL
Kubernetes | EKS | AKS | GKE
AI/ML Platform | Bedrock / SageMaker | Azure OpenAI | Vertex AI
CDN | CloudFront | Azure CDN | Cloud CDN
DEVELOPER-FRIENDLY PLATFORMS (STARTUPS & MVPs)
Vercel
Frontend + serverless
Render
Simple full-stack
Railway
One-click deploys
Fly.io
Edge deployment
Supabase
DB + API + Auth
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 9 ---
CLOUD ARCHITECTURE
Patterns, Serverless & Cost Management
MONOLITH vs MICROSERVICES vs SERVERLESS
Monolith
One big application
Simple to start, complex to scale
Best for: MVPs, small teams
Ex: Early Shopify, Basecamp
Microservices
Many small services via APIs
Complex but infinitely scalable
Best for: Large teams, scale
Ex: Netflix, Amazon, Uber
Serverless
Functions run on demand
Zero infra management
Best for: Event-driven, APIs
Ex: Vercel, Lambda, Cloudflare
CLOUD COST MANAGEMENT — WHAT PMs MUST KNOW
Cost Driver | What It Is | How to Control
Compute | CPU/server hours running | Right-size instances; use auto-scaling
Storage | Data stored (GB/TB) | Lifecycle policies; archive cold data to S3 Glacier
Bandwidth | Data transfer out | Use CDNs (CloudFront); compress responses
Serverless calls | Per-invocation pricing | Batch operations; optimize function duration
PM
PM IMPLICATION
Start monolith, extract microservices only when needed. "Premature microservices" is the #1 architecture mistake at startups. Set billing alerts from day one — cloud bills surprise everyone.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 10 ---
CHAPTER 11
The AI/ML Ecosystem
THE AI STACK — FROM HARDWARE TO APPLICATION
Hardware
(Bottom)
GPUs (NVIDIA H100)
TPUs (Google)
Cloud AI chips
Frameworks
(Middle)
PyTorch, TensorFlow
scikit-learn, JAX
Hugging Face
LLM Layer
(Models)
GPT-4, Claude, Gemini
Llama, Mistral, Phi
(frontier + open-source)
Application
(Top)
LangChain, RAG
Vector DBs, agents
Fine-tuning, prompts
KEY AI FRAMEWORKS & TOOLS
Tool | Type | Best For
PyTorch | Deep learning framework | Research → production; most popular for new projects
TensorFlow | Deep learning framework | Production ML at scale; Google ecosystem
scikit-learn | Classical ML library | Classification, regression, clustering — tabular data
Hugging Face | Model hub + tools | Pre-trained models, fine-tuning, model sharing
LangChain | LLM orchestration | Building AI apps: chains, agents, RAG pipelines
MLOps — PUTTING AI INTO PRODUCTION
Data Pipeline
Collect, clean,
label training data
Model Training
Train, evaluate,
version models
Model Serving
Deploy as API
endpoint at scale
Monitoring
Track drift, accuracy,
latency, cost
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 11 ---
CHAPTERS 12–13
Enterprise Systems & Legacy Technologies
MAJOR ERP & ENTERPRISE PLATFORMS
Platform | Focus Area | Key Strength | Market Position
SAP S/4HANA | ERP (finance, supply chain, HR) | Deepest industry processes | Dominant in large enterprise
Oracle ERP Cloud | ERP + database + cloud | Database integration | Strong in finance-heavy orgs
Dynamics 365 | ERP + CRM (Microsoft) | Office 365 integration | Growing in mid-market
Salesforce | CRM + platform | Customer 360, app ecosystem | #1 CRM worldwide
ServiceNow | IT service management | Workflow automation | IT operations leader
Workday | HR & finance | People analytics, UX | Preferred for HR/payroll
LEGACY & MAINFRAME TECHNOLOGIES
The Legacy Reality
IBM z/OS mainframes still process 90% of credit card transactions globally. COBOL (1959) runs most banking & government systems. 95% of ATM transactions touch COBOL. Average COBOL programmer age: 55+.
Modernization Approaches
Encapsulate: wrap legacy in APIs (lowest risk)
Replatform: move to cloud with minimal changes
Refactor: rewrite core modules in modern stack
Replace: full SaaS replacement (highest risk)
PM
PM IMPLICATION
PMs working with legacy systems: don''t propose "rewrite everything." Start by wrapping the old system in APIs so new features connect to it. Migration takes years — plan incremental wins.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 12 ---
CHAPTER 14
Popular Stack Combinations
Developers often use pre-established "stack combos" — tested combinations that work well together.
Stack | Components | Best For | Example Companies
LAMP | Linux, Apache, MySQL, PHP | Traditional web apps, CMS | WordPress, Facebook (early)
MEAN | MongoDB, Express, Angular, Node | Full-stack JavaScript (Angular) | Large JS enterprise apps
MERN | MongoDB, Express, React, Node | Full-stack JavaScript (React) | Most popular JS stack 2024
T3 | TypeScript, tRPC, Tailwind, Next.js | Type-safe modern full-stack | Startups, SaaS products
Jamstack | JavaScript, APIs, Markup (CDN) | Static sites + APIs, fast & secure | Blogs, marketing, e-commerce
Django + React | Python backend + React frontend | AI/ML products with rich UIs | Instagram, Pinterest
Spring + Angular | Java backend + Angular frontend | Enterprise B2B applications | Banks, large corporates
THE MODERN STARTUP STACK (2024+)
Next.js
(Frontend)
React framework
SSR + API routes
TypeScript
(Language)
Type safety across
entire codebase
PostgreSQL
(Database)
Via Supabase, Neon,
or Prisma ORM
Tailwind
(Styling)
Utility-first CSS
Rapid development
Vercel
(Hosting)
Auto-deploy from
GitHub, edge CDN
PM
PM IMPLICATION
Don''t overthink the stack for an MVP. Pick MERN or T3 (most tutorials, largest community), ship fast, and optimize later. The best stack is the one your team ships with.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 13 ---
CHAPTER 15
DevOps, CI/CD & Infrastructure
THE CI/CD PIPELINE — AUTOMATE EVERYTHING
Code
Commit
→
Build &
Test
→
Security
Scan
→
Deploy to
Staging
→
Deploy to
Production
KEY DEVOPS TOOLS & PRACTICES
Practice | Tools | PM Value
Version Control | GitHub, GitLab, Bitbucket | Audit trail; code review process
CI/CD | GitHub Actions, GitLab CI, Jenkins | Faster, safer deployments
Containerization | Docker | Consistent environments; faster onboarding
Orchestration | Kubernetes (K8s), ECS, Cloud Run | Scalable deployment automation
Infrastructure as Code | Terraform, AWS CDK, Pulumi | Reproducible, auditable infrastructure
Feature Flags | LaunchDarkly, Unleash | Decouple deployment from release
Monitoring | Datadog, New Relic, Grafana | Detect and diagnose incidents
Error Tracking | Sentry | Prioritize bugs by user impact
PM
PM IMPLICATION
As a PM, you should know: How long does a deploy take? Can we roll back instantly? Do we have feature flags to ship dark? These questions determine your release velocity.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 14 ---
CHAPTER 16
Cybersecurity & Compliance
OWASP TOP 10 — MOST COMMON WEB VULNERABILITIES
# | Vulnerability | Simple Explanation | Prevention
1 | Broken Access Control | Users access data they shouldn''t | Role-based access, test permissions
2 | Cryptographic Failures | Sensitive data not encrypted | HTTPS everywhere, encrypt at rest
3 | Injection (SQL/XSS) | Malicious input tricks the database | Parameterized queries, input validation
4 | Insecure Design | Architecture lacks security thinking | Threat modeling in design phase
5 | Security Misconfiguration | Default passwords, open ports | Security checklists, automated scans
SECURITY BY LAYER
Network
Firewalls, WAF,
DDoS protection
Application
Input validation,
auth, rate limiting
Data
Encryption at rest
and in transit
Identity
MFA, OAuth, RBAC
session management
Operations
Logging, monitoring,
incident response
COMPLIANCE FRAMEWORKS EVERY PM SHOULD KNOW
SOC 2
SaaS trust standard
Type I & Type II
ISO 27001
Global info security
management system
PCI DSS
Payment card data
protection standard
HIPAA
US healthcare data
protection rules
GDPR
EU data privacy
Fines up to €20M
DPDP Act
India data privacy
Fines up to ₹250 Cr
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 15 ---
CHAPTER 17
How to Choose a Tech Stack
THE 7 DIMENSIONS OF STACK SELECTION
Dimension | Key Question | What to Consider
1. Team Expertise | What does your team already know? | Existing skills reduce ramp-up time by 3-6 months
2. Hiring Market | Can you find developers for this stack? | Python & JS = large pool; Go & Rust = scarce, expensive
3. Problem Fit | Does the tech match the problem domain? | AI → Python; Real-time → Node.js; Enterprise → Java
4. Scalability | How much growth must the stack support? | Vertical (bigger server) vs horizontal (more servers)
5. Time to Market | How fast must you ship? | Rails/Django = fast MVP; Java/C# = slower but robust
6. Total Cost | Licensing, hosting, hiring, maintenance? | Open-source vs vendor lock-in; cloud vs on-premise
7. Vendor Maturity | Is the technology stable and supported? | Community size, update frequency, long-term viability
DECISION FRAMEWORK — START HERE
Startup / MVP
Python or TypeScript
PostgreSQL + Redis
Vercel or Railway
Mid-Stage Product
Add dedicated services
Microservices where needed
AWS or GCP
Enterprise / Scale
Java or .NET core services
Kubernetes orchestration
Multi-region, compliance
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 16 ---
STACK EVOLUTION
When to Modernize & Common Mistakes
SIGNS YOUR STACK NEEDS MODERNIZATION
Trigger | What You''ll See | Likely Action
Deploys take hours, not minutes | Manual processes, no CI/CD | Implement automated pipeline
Can''t hire developers for it | COBOL, legacy PHP, outdated frameworks | Plan incremental migration
Scaling hits hard limits | Vertical scaling maxed out | Refactor for horizontal scale
Security vulnerabilities pile up | Outdated dependencies, no patches | Upgrade runtime; add scanning
New features take 10x longer | Tightly coupled monolith, technical debt | Extract services; refactor core
COMMON STACK SELECTION MISTAKES
"Use what Netflix uses"
Their problems are not your problems. You have 100 users, not 100 million.
"Rewrite everything in [hot language]"
Most rewrites fail or take 2x longer. Modernize incrementally.
"We need microservices from day one"
Premature microservices kill startups. Start monolith, split later.
"Let''s build our own framework"
Custom infrastructure = maintenance forever. Use battle-tested tools.
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 17 ---
CHAPTER 18
Emerging Technologies
TECHNOLOGIES RESHAPING THE LANDSCAPE
WebAssembly
(WASM)
Run C/C++/Rust in browser
at near-native speed.
Figma uses it.
Edge
Computing
Run code closer to users.
Cloudflare Workers,
Vercel Edge Functions.
AI-Native
Development
AI writes code: Copilot,
Cursor, v0. 3-person team
= old 10-person output.
Serverless
Databases
Scale to zero, pay per query.
Neon, PlanetScale,
Turso, Supabase.
Blockchain
& Web3
Supply chain traceability,
trade finance, identity.
Be skeptical of hype.
Quantum
Computing
NISQ era (IBM 1,121 qubits).
Post-quantum crypto is
real; 3-5yr migration.
No-Code /
Low-Code
Non-engineers build apps.
Bubble, Retool, Webflow.
Best for internal tools.
Autonomous
Agents
AI that plans + executes.
Multi-step task automation.
Still early but advancing.
NO-CODE PLATFORMS QUICK REFERENCE
Platform | Type | Best For
Bubble | No-code web apps | Founder prototypes, simple SaaS MVPs
Retool | Low-code internal tools | Admin panels, data dashboards
Webflow | No-code websites | Marketing sites, landing pages
n8n / Make / Zapier | No-code automation | Workflow automation, API integrations
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 18 ---
APPENDIX A.1–A.2
Quick Reference: Languages & Frameworks
LANGUAGE CHEAT SHEET
Language | Year | Primary Use | Killer Feature | Avoid For
Python | 1991 | AI/ML, data, web | AI dominance | Mobile, high concurrency
JavaScript | 1995 | Web (browser + server) | Runs everywhere | CPU-intensive work
TypeScript | 2012 | Full-stack with types | Type safety | Quick throwaway scripts
Java | 1995 | Enterprise, Android | JVM maturity | Rapid prototyping
C# / .NET | 2000 | Enterprise, games | Microsoft ecosystem | Non-Windows teams
Go | 2009 | APIs, infrastructure | Fast, single binary | Feature-rich apps
Rust | 2015 | Systems, WASM | Memory safety, no GC | Most web apps
Swift | 2014 | iOS/macOS native | Apple ecosystem | Cross-platform
Kotlin | 2011 | Android, JVM | Java interop | Large Java teams
TOP FRAMEWORKS
Framework | Language | Type | Best For
React / Next.js | JS/TS | Frontend + full-stack | Most web UIs, modern web products
Django / FastAPI | Python | Backend | Content sites, modern APIs, AI backends
Spring Boot | Java | Backend | Enterprise B2B SaaS, financial services
Express / NestJS | JS/TS | Backend | Simple APIs, structured Node.js backends
Flutter / React Native | Dart / JS | Mobile | Cross-platform iOS + Android apps
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 19 ---
APPENDIX A.3–A.5
Quick Reference: Databases, Cloud & DevOps
DATABASE QUICK REFERENCE
Database | Type | ACID | Best For | Cloud Options
PostgreSQL | Relational | Yes | Default choice for most apps | AWS RDS, Supabase, Neon
MySQL | Relational | Yes | PHP/Laravel, WordPress | AWS RDS, PlanetScale
MongoDB | Document | Limited | Flexible schemas, JSON apps | MongoDB Atlas
Redis | Key-Value | Limited | Caching, sessions, queues | ElastiCache, Redis Cloud
Cassandra | Wide-column | No | Billions of writes/day, IoT | AWS Keyspaces, DataStax
Neo4j | Graph | Yes | Social graphs, recommendations | Neo4j AuraDB
DEVOPS QUICK REFERENCE
Practice | Key Tools | PM Value
Version Control | GitHub, GitLab, Bitbucket | Audit trail; code review process
CI/CD | GitHub Actions, GitLab CI, Jenkins | Faster, safer deployments
Containers | Docker | Consistent environments; faster onboarding
Orchestration | Kubernetes, ECS, Cloud Run | Scalable deployment automation
Infrastructure as Code | Terraform, AWS CDK, Pulumi | Reproducible, auditable infrastructure
Monitoring | Datadog, New Relic, Grafana, Sentry | Detect issues, track user impact
Feature Flags | LaunchDarkly, Unleash | Ship dark; decouple deploy from release
Tech Stacks Guide  |  HSB — Product Management II  |  Prof. Anand Viantos

--- Slide 20 ---
Technology Stacks Guide
Frameworks for thinking about stacks, trade-offs, and PM implications remain durable.
The best stack is the one your team ships with — optimize later.
HSB — Product Management II  |  Dr,. Anand Fadte','completed','');
CREATE TABLE quiz_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_id INTEGER NOT NULL,
                    score INTEGER NOT NULL,
                    total_questions INTEGER NOT NULL,
                    attempted_at TEXT NOT NULL DEFAULT (datetime('now')), results_json TEXT DEFAULT "",
                    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
                );
INSERT INTO "quiz_attempts" VALUES(4,4,2,5,'2026-10-30 07:06:51','[{"question_id": 31, "question_text": "A manager is evaluating whether a 10% increase in the price of a product will lead to a significant drop in sales. This type of analysis is best described as:", "options": ["Normative Analysis", "Positive Analysis", "Market Definition", "Circular Flow Analysis"], "selected_option_index": 1, "correct_option_index": 1, "is_correct": true, "explanation": "Positive analysis deals with cause-and-effect relationships and predictions (if X happens, then Y follows). Normative analysis would ask if the price *should* be raised. Market definition identifies the players, and circular flow describes the macro-economy. Remember: Positive = Facts/Predictions; Normative = Values/Opinions."}, {"question_id": 32, "question_text": "In the Circular-Flow Model, which of the following is true regarding the Resource Market?", "options": ["Firms supply goods and services to households.", "Households demand resources from firms.", "Firms demand resources and households supply them.", "It determines the prices of final consumer goods."], "selected_option_index": 2, "correct_option_index": 2, "is_correct": true, "explanation": "In the resource market, households are the suppliers (providing labor, land, and capital) and firms are the demanders (buying those inputs to produce goods). Option 0 and 3 describe the Product Market. Option 1 is the reverse of reality. Key takeaway: Households own the factors of production."}, {"question_id": 33, "question_text": "Which market structure is characterized by a ''price taker'' environment where no individual firm can influence the market price?", "options": ["Monopoly", "Cartel", "Perfectly Competitive Market", "Noncompetitive Market"], "selected_option_index": 3, "correct_option_index": 2, "is_correct": false, "explanation": "In a perfectly competitive market, the presence of many buyers and sellers ensures that no single entity has market power. Monopolies and Cartels (like OPEC) are noncompetitive and are ''price makers.'' Rule: High competition leads to price-taking behavior."}, {"question_id": 34, "question_text": "If the Nominal Price of a product was Rs 20 in 2010 (CPI = 100) and is Rs 100 in 2023 (CPI = 400), what is the Real Price of the product in 2010 terms?", "options": ["Rs 20", "Rs 25", "Rs 80", "Rs 400"], "selected_option_index": 2, "correct_option_index": 1, "is_correct": false, "explanation": "Using the formula: (Base CPI / Current CPI) * Current Nominal Price = (100 / 400) * 100 = 0.25 * 100 = Rs 25. This means that although the nominal price is 100, its value in 2010 purchasing power is only Rs 25. Since 25 > 20, the real price has increased."}, {"question_id": 35, "question_text": "Which of the following is a ''Normative'' economic statement?", "options": ["The unemployment rate in India is currently 7%.", "A higher tax on cigarettes will reduce the number of smokers.", "The government should provide free healthcare to all citizens.", "When the price of a good rises, the quantity demanded usually falls."], "selected_option_index": 3, "correct_option_index": 2, "is_correct": false, "explanation": "The word ''should'' indicates a value judgment or a statement of what ought to be, which is the definition of Normative Analysis. The other options are Positive statements because they can be tested or verified with data. Concept: Normative = ''Ought'', Positive = ''Is''."}]');
INSERT INTO "quiz_attempts" VALUES(5,4,1,5,'2026-11-02 18:56:37','[{"question_id": 31, "question_text": "A manager is evaluating whether a 10% increase in the price of a product will lead to a significant drop in sales. This type of analysis is best described as:", "options": ["Normative Analysis", "Positive Analysis", "Market Definition", "Circular Flow Analysis"], "selected_option_index": 1, "correct_option_index": 1, "is_correct": true, "explanation": "Positive analysis deals with cause-and-effect relationships and predictions (if X happens, then Y follows). Normative analysis would ask if the price *should* be raised. Market definition identifies the players, and circular flow describes the macro-economy. Remember: Positive = Facts/Predictions; Normative = Values/Opinions."}, {"question_id": 32, "question_text": "In the Circular-Flow Model, which of the following is true regarding the Resource Market?", "options": ["Firms supply goods and services to households.", "Households demand resources from firms.", "Firms demand resources and households supply them.", "It determines the prices of final consumer goods."], "selected_option_index": 0, "correct_option_index": 2, "is_correct": false, "explanation": "In the resource market, households are the suppliers (providing labor, land, and capital) and firms are the demanders (buying those inputs to produce goods). Option 0 and 3 describe the Product Market. Option 1 is the reverse of reality. Key takeaway: Households own the factors of production."}, {"question_id": 33, "question_text": "Which market structure is characterized by a ''price taker'' environment where no individual firm can influence the market price?", "options": ["Monopoly", "Cartel", "Perfectly Competitive Market", "Noncompetitive Market"], "selected_option_index": 0, "correct_option_index": 2, "is_correct": false, "explanation": "In a perfectly competitive market, the presence of many buyers and sellers ensures that no single entity has market power. Monopolies and Cartels (like OPEC) are noncompetitive and are ''price makers.'' Rule: High competition leads to price-taking behavior."}, {"question_id": 34, "question_text": "If the Nominal Price of a product was Rs 20 in 2010 (CPI = 100) and is Rs 100 in 2023 (CPI = 400), what is the Real Price of the product in 2010 terms?", "options": ["Rs 20", "Rs 25", "Rs 80", "Rs 400"], "selected_option_index": 3, "correct_option_index": 1, "is_correct": false, "explanation": "Using the formula: (Base CPI / Current CPI) * Current Nominal Price = (100 / 400) * 100 = 0.25 * 100 = Rs 25. This means that although the nominal price is 100, its value in 2010 purchasing power is only Rs 25. Since 25 > 20, the real price has increased."}, {"question_id": 35, "question_text": "Which of the following is a ''Normative'' economic statement?", "options": ["The unemployment rate in India is currently 7%.", "A higher tax on cigarettes will reduce the number of smokers.", "The government should provide free healthcare to all citizens.", "When the price of a good rises, the quantity demanded usually falls."], "selected_option_index": 0, "correct_option_index": 2, "is_correct": false, "explanation": "The word ''should'' indicates a value judgment or a statement of what ought to be, which is the definition of Normative Analysis. The other options are Positive statements because they can be tested or verified with data. Concept: Normative = ''Ought'', Positive = ''Is''."}]');
CREATE TABLE quiz_questions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_id INTEGER NOT NULL,
                    question_text TEXT NOT NULL,
                    options_json TEXT NOT NULL,
                    correct_option_index INTEGER NOT NULL,
                    explanation TEXT NOT NULL,
                    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
                );
INSERT INTO "quiz_questions" VALUES(76,6,'A startup is building a new AI-powered healthcare platform that requires high data consistency for patient records and rapid iteration for its LLM-based features. Which combination of technologies would be most appropriate for their initial stack?','["COBOL for the backend, MongoDB for data, and Native iOS.", "Python (FastAPI) for the backend, PostgreSQL for data, and Next.js for the frontend.", "Java (Spring Boot) for the backend, Neo4j for data, and Flutter for mobile.", "Rust for the backend, Redis for the primary database, and HTML/CSS only."]',1,'Python is the industry standard for AI/LLM integration. PostgreSQL provides the ACID compliance required for sensitive healthcare ''patient records'' (consistency). Next.js allows for rapid frontend iteration. Choice 0 is outdated; Choice 2 is too heavy for a startup; Choice 3 uses Redis as a primary DB, which is risky as it is primarily for caching and lacks the relational structure needed for patient records. Concept: Match the tool to the specific domain requirements (AI + Consistency).');
INSERT INTO "quiz_questions" VALUES(77,6,'A PM at a mid-sized e-commerce company notices that the engineering team spends 3 days manually testing and deploying every small text change to the website. Which DevOps practice should the PM advocate for to solve this?','["Moving from AWS to Azure.", "Rewriting the Monolith into Microservices.", "Implementing a CI/CD pipeline with automated testing.", "Switching from SQL to a NoSQL database."]',2,'The bottleneck described is a manual deployment process. CI/CD (Continuous Integration/Continuous Deployment) automates the ''Build, Test, and Deploy'' phases, allowing for rapid, low-risk updates. Changing cloud providers (Choice 0) or database types (Choice 3) does not address deployment speed. Microservices (Choice 1) actually increase deployment complexity if a pipeline isn''t already in place. Concept: CI/CD is the primary driver of release velocity.');
INSERT INTO "quiz_questions" VALUES(78,6,'When deciding between Native (Swift/Kotlin) and Cross-Platform (React Native/Flutter) for a new mobile app, which scenario would most strongly justify choosing Native?','["The app is a simple content-based news reader.", "The company has a very limited budget and needs to ship to both iOS and Android in 2 months.", "The app requires high-performance 3D graphics and deep integration with the latest iOS-specific ARKit features.", "The team consists entirely of JavaScript developers."]',2,'Native development is required when an app needs 100% performance or access to cutting-edge, platform-specific APIs (like Apple''s ARKit). For simple apps (Choice 0) or tight budgets (Choice 1), cross-platform is superior. If the team knows JS (Choice 3), React Native would be the logical choice. Concept: Native is for performance/specialized hardware; Cross-platform is for business efficiency.');
INSERT INTO "quiz_questions" VALUES(79,6,'An enterprise bank still uses a mainframe system written in COBOL for its core ledger. The PM wants to launch a modern mobile banking app. What is the most recommended ''Modernization Approach'' according to the course material?','["Refactor: Rewrite the entire COBOL ledger in Rust immediately.", "Replace: Buy a new SaaS ERP and migrate all data over the weekend.", "Encapsulate: Wrap the legacy system in modern APIs to allow the new app to communicate with it.", "Replatform: Move the COBOL code to a Linux server without changing any logic."]',2,'For mission-critical legacy systems (like banking ledgers), a total rewrite (Choice 0) or sudden replacement (Choice 1) is extremely high-risk and often fails. Encapsulation allows the bank to build modern features (the app) while keeping the stable, proven core intact. Replatforming (Choice 3) doesn''t help the mobile app talk to the old code. Concept: Incremental modernization via APIs is the safest path for legacy tech.');
INSERT INTO "quiz_questions" VALUES(80,6,'Which of the following best describes the ''Premature Microservices'' trap mentioned in the guide?','["Using a database that cannot scale horizontally.", "Adopting a complex distributed system architecture before the product or team size justifies the overhead.", "Choosing Python for a backend that requires high concurrency.", "Failing to implement encryption at rest for user passwords."]',1,'Microservices add significant ''architectural tax'' (network latency, complex debugging, service orchestration). Startups should usually start with a Monolith to move fast and only split into Microservices when the team grows too large to work on one codebase. Choice 3 is a language mismatch, and Choice 4 is a security failure. Concept: Complexity should follow scale, not precede it.');
INSERT INTO "quiz_questions" VALUES(81,4,'A manager is analyzing the impact of a new carbon tax on the company''s production costs and subsequent market price. This type of analysis is best categorized as:','["Normative Analysis", "Positive Analysis", "Market Definition", "Circular Flow Modeling"]',1,'Positive analysis deals with cause-and-effect relationships and objective predictions (e.g., how a tax affects cost). Normative analysis would involve deciding if the tax ''should'' exist. Market definition is about identifying competitors, and circular flow is a macro-model of the economy. Concept takeaway: Positive = ''What is/will be''.');
INSERT INTO "quiz_questions" VALUES(82,4,'In the year 2010, the CPI was 150 and the price of a movie ticket was Rs 150. In 2020, the CPI is 450 and the movie ticket costs Rs 400. What is the real price of the 2020 ticket in 2010 rupees?','["Rs 133.33", "Rs 400.00", "Rs 150.00", "Rs 1,200.00"]',0,'Using the formula: Real Price = (CPI_Old / CPI_New) * Nominal_Price_New. Calculation: (150 / 450) * 400 = (1/3) * 400 = 133.33. This means the ticket is actually cheaper in real terms than in 2010. Distractors represent incorrect formula applications or unadjusted nominal values.');
INSERT INTO "quiz_questions" VALUES(83,4,'Which of the following is a characteristic of a perfectly competitive market?','["A few large firms dominate the market supply.", "Individual sellers can influence the market price by changing their output.", "There are so many buyers and sellers that no one can influence the price.", "The government centrally plans the prices of all goods."]',2,'In perfect competition, firms are ''price takers'' due to the high volume of participants and product homogeneity. Option 0 describes an oligopoly; Option 1 describes market power (noncompetitive); Option 3 describes a centrally planned economy. Rule: Perfect competition = Zero individual price influence.');
INSERT INTO "quiz_questions" VALUES(84,4,'According to the Circular-Flow Model, where do firms obtain the ''factors of production'' such as labor and capital?','["The Product Market", "The Government Sector", "The Resource Market", "The International Trade Market"]',2,'Firms demand resources (labor, land, capital) in the Resource Market, which are supplied by households. The Product Market is where firms sell their finished goods. While the government and international sectors exist, they are not the primary source of basic factors in the fundamental circular flow model.');
INSERT INTO "quiz_questions" VALUES(85,4,'A product manager is deciding whether to launch a premium version of a detergent. Which ''Theme of Microeconomics'' most directly addresses the consumer''s decision to buy this premium version over a cheaper one?','["Theory of the Firm", "Positive Analysis", "Consumer Theory", "Market Structure"]',2,'Consumer Theory describes how individuals maximize well-being by making trade-offs based on preferences and limited income. Theory of the firm focuses on the producer''s side. While the manager uses positive analysis, the ''theme'' governing the consumer''s choice is Consumer Theory. Concept: Preferences + Budget = Choice.');
CREATE TABLE sticky_notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    color TEXT NOT NULL DEFAULT 'purple',
                    is_completed INTEGER DEFAULT 0,
                    is_pinned INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
INSERT INTO "sticky_notes" VALUES(1,'Statistics Exam – 15 Nov','yellow',1,1,'2026-11-02 17:09:08');
INSERT INTO "sticky_notes" VALUES(2,'Revise Unit 2 today','purple',0,1,'2026-11-02 17:09:08');
INSERT INTO "sticky_notes" VALUES(3,'Complete Marketing Assignment','cyan',0,0,'2026-11-02 17:09:08');
CREATE TABLE study_packs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    material_id INTEGER NOT NULL UNIQUE,
                    summary TEXT NOT NULL,
                    key_concepts_json TEXT NOT NULL,
                    revision_notes TEXT NOT NULL,
                    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
                    model_name TEXT NOT NULL,
                    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
                );
INSERT INTO "study_packs" VALUES(16,6,'This course module provides a comprehensive strategic framework for Product Managers to navigate the modern technology landscape, emphasizing that while PMs do not choose the stack, they must master its trade-offs to influence feasibility, cost, and speed-to-market. The curriculum decomposes the ''Tech Stack'' into four critical layers—Frontend, Backend, Database, and Infrastructure—while exploring the nuances of mobile development, cloud architecture, and the burgeoning AI/ML ecosystem. By synthesizing technical constraints with business objectives, the material equips PMs to manage the lifecycle of a product from MVP (Minimum Viable Product) to enterprise-scale systems, including the delicate handling of legacy modernization and cybersecurity compliance.','[{"title": "The Four-Layer Tech Stack Model", "explanation": "A tech stack is the integrated ecosystem of software and services used to build and run a product. It is conceptually divided into the Frontend (the presentation layer), Backend (the logic layer), Database (the persistence layer), and Infrastructure (the hosting layer). Understanding these layers allows a PM to identify where a bottleneck or cost driver resides within the system architecture.", "example": "In a food delivery app, the Frontend is the mobile interface where users browse menus; the Backend calculates delivery times and processes payments; the Database stores user profiles and order history; and the Infrastructure (e.g., AWS) ensures the app stays online during peak dinner hours."}, {"title": "Cross-Platform vs. Native Mobile Development", "explanation": "This represents a strategic trade-off between performance and development efficiency. Native development (Swift for iOS, Kotlin for Android) offers 100% access to device features and peak performance but requires two separate codebases. Cross-platform frameworks (React Native, Flutter) allow for a single codebase that runs on both platforms, significantly reducing time-to-market and cost at the expense of a slight performance overhead (approx. 5-10%).", "example": "A high-end mobile game or an AR-based interior design app would choose Native for performance, whereas a standard B2B SaaS dashboard would likely choose React Native to ship features to all users simultaneously."}, {"title": "Relational (SQL) vs. Non-Relational (NoSQL) Databases", "explanation": "SQL databases (like PostgreSQL) use structured tables and are ACID-compliant, ensuring data integrity and consistency, which is vital for financial transactions. NoSQL databases (like MongoDB) offer flexible schemas and horizontal scaling, making them ideal for unstructured data or rapidly changing requirements where speed and volume outweigh strict relational consistency.", "example": "A banking application must use a SQL database to ensure that a transfer of $100 is accurately deducted from one account and added to another without error. Conversely, a social media feed might use NoSQL to handle millions of diverse posts and comments with varying formats."}, {"title": "Monolith vs. Microservices Architecture", "explanation": "A Monolith is a single, unified unit where all functions are tightly coupled, making it easy to develop and deploy initially. Microservices break the application into small, independent services that communicate via APIs, allowing for massive scale and independent team deployments. However, microservices introduce significant operational complexity and ''premature microservices'' is a common failure point for startups.", "example": "A startup begins with a Monolith to find product-market fit quickly. As they grow to the size of Netflix, they transition to Microservices so the ''Search'' team can update their code without needing to coordinate a deployment with the ''Billing'' team."}, {"title": "The AI Stack & RAG", "explanation": "The modern AI stack spans from hardware (GPUs) to the application layer. A critical pattern for PMs is Retrieval-Augmented Generation (RAG), which connects Large Language Models (LLMs) like GPT-4 to a company''s private data via Vector Databases (like Pinecone). This allows the AI to provide context-aware, factual answers without needing to constantly retrain the underlying model.", "example": "A customer support bot uses RAG to search a company''s internal PDF manuals (stored in a Vector DB) and then uses an LLM to summarize the specific answer for a customer''s unique query."}]','# Masterclass Revision Notes: Technology Stacks for Product Managers

## 1. The Core Mental Model: The Tech Stack as a Building
**Intuition**: Think of a tech stack like a modern skyscraper. 
- **Frontend**: The lobby, the windows, and the buttons in the elevator—everything the inhabitant (user) touches.
- **Backend**: The hidden machinery—the elevator motors, the plumbing, and the electrical grid that makes the building functional.
- **Database**: The filing cabinets and storage basement where all records are kept.
- **Infrastructure**: The foundation and the land the building sits on (the Cloud).

### Why PMs Care (The ''So What?'')
As a PM, you don''t need to lay the bricks, but you need to know if you''re asking for a marble lobby (expensive/slow) or a glass one. Stack choices dictate **Feasibility** (can we build it?), **Timelines** (how fast?), and **Hiring** (can we find people who know this language?).

---

## 2. Frontend: The User''s Window
### The Holy Trinity
1. **HTML**: The skeleton (Structure).
2. **CSS**: The skin and clothes (Styling).
3. **JavaScript**: The muscles and brain (Interactivity).

### Framework Wars: Which to Choose?
- **React**: The industry standard. Best for interactive apps (SPAs). Used by Netflix.
- **Angular**: The ''Enterprise'' choice. Strict and robust. Used by banks.
- **Next.js**: The 2024 favorite. It handles both the frontend and some backend logic (Server-Side Rendering), making sites incredibly fast.

**💡 Exam Secret**: If a question asks for the best framework for a ''fast-moving startup'' in 2024, the answer is almost always **Next.js + Tailwind CSS**.

---

## 3. Backend: The Engine Room
### Language Selection Logic
- **Python**: The King of AI/ML. If your product involves data science, use Python. *Trap: Avoid for high-performance mobile apps.*
- **TypeScript (Node.js)**: The ''Full-Stack'' hero. Developers can use the same language for front and back, which is a massive efficiency gain for small teams.
- **Go (Golang)**: Built by Google for speed. Use this for high-performance APIs and infrastructure tools.
- **Java/C#**: The ''Old Guard.'' Extremely stable and easy to hire for in large corporate environments.

### Numerical Example: The Cost of a Rewrite
Imagine your team builds an MVP in **Ruby on Rails** (fast to build). You reach 1 million users and the system slows down. You decide to rewrite in **Go**.
- **Initial Build (Ruby)**: 4 months, 3 devs = $120k.
- **Rewrite (Go)**: 12 months, 5 devs = $600k.
- **Opportunity Cost**: 12 months of no new features.
**Takeaway**: Pick a stack that can scale to at least 10x your current volume to avoid the ''Rewrite Trap.''

---

## 4. Databases: Where Data Lives
### SQL vs. NoSQL (The Library vs. The Pile)
- **SQL (PostgreSQL)**: Like a library with a strict filing system. You know exactly where everything is. Best for ''Mission Critical'' data.
- **NoSQL (MongoDB)**: Like a pile of folders. You can throw anything in there quickly. Best for ''Big Data'' or ''Rapid Prototyping.''

**New Category: Vector Databases**: These are essential for AI. They store data as ''embeddings'' (numbers) so AI can find similar concepts rather than just matching keywords.

---

## 5. Cloud & DevOps: The ''Where'' and ''How''
### The Big Three
- **AWS**: The giant. Has every tool imaginable but can be complex.
- **Azure**: The choice for companies already using Microsoft Office/Windows.
- **GCP**: The leader in AI and Data Analytics (BigQuery).

### CI/CD: The Assembly Line
**Continuous Integration / Continuous Deployment** is the process of automatically testing and shipping code. 
- **PM Value**: High CI/CD maturity means you can ship a bug fix in 10 minutes instead of 2 weeks.
- **Feature Flags**: A ''kill switch'' that allows you to turn a feature on or off for specific users without a full code deploy.

---

## 6. Cybersecurity: The PM''s Shield
**OWASP Top 10**: The list of the most common ways hackers break in. 
- **Injection**: Tricking a database into giving up data via a text box.
- **Broken Access Control**: A user seeing another user''s private profile.

**Compliance Mnemonics**:
- **GDPR**: Europe = Privacy.
- **HIPAA**: Hospital = Health data.
- **PCI**: Plastic = Credit Cards.
- **SOC2**: SaaS = Trust/Security audit.

---

## 💡 Top-Ranker Exam Tips
1. **Premature Optimization**: If a question asks about starting a new MVP, **never** choose Microservices or Rust. Choose a Monolith and a common language (Python/JS).
2. **Legacy Systems**: Don''t suggest a ''total rewrite'' for a bank running COBOL. Suggest ''Encapsulation'' (wrapping the old code in a modern API).
3. **Hiring**: A stack isn''t just code; it''s a recruiting strategy. It''s easier to find 100 React devs than 5 Rust devs.','2026-11-04 19:55:29','gemini-3-flash-preview');
INSERT INTO "study_packs" VALUES(17,4,'Managerial Economics serves as the strategic bridge between theoretical economic principles and the practical decision-making processes of a firm. At its core, the discipline addresses the fundamental problem of scarcity—how to allocate limited resources (time, capital, and labor) to maximize organizational objectives like profitability and market share. By synthesizing consumer behavior theory with the theory of the firm, it provides a framework for product managers to navigate complex choices regarding product design, pricing, and market entry while accounting for external constraints such as government regulation and market structure.

The course framework is built upon the interaction of supply and demand within various market structures, ranging from perfectly competitive environments to noncompetitive monopolies and cartels. A critical distinction is made between positive analysis, which uses cause-and-effect modeling to predict market outcomes, and normative analysis, which involves value judgments about what policies ''ought'' to be implemented. Ultimately, the study of managerial economics equips leaders with the analytical tools—such as real price calculations and game-theoretic strategies—to make informed decisions in an environment characterized by risk and uncertainty.','[{"title": "The Circular-Flow Model", "explanation": "This model visualizes the economy as a continuous loop of resources and money between two primary actors: Households and Firms. Households supply resources (labor, land, capital) in the resource market and receive income (wages, rent, profit), which they then spend in the product market to buy goods. Firms use these resources to produce goods, selling them back to households to generate revenue. It illustrates that every rupee spent by a consumer is a rupee of income for a producer.", "example": "When you work a summer internship, you are a household member supplying labor in the resource market for a wage; when you use that wage to buy a smartphone, you are participating in the product market, providing revenue to the firm."}, {"title": "Positive vs. Normative Analysis", "explanation": "Positive analysis is objective and fact-based, focusing on ''what is'' by describing causal relationships and making predictions (e.g., ''If we raise taxes, consumption will fall''). Normative analysis is subjective and value-based, focusing on ''what should be'' (e.g., ''The government should raise taxes to reduce inequality''). Managerial decisions often start with positive analysis to understand impact and end with normative judgments based on corporate values.", "example": "A positive statement: ''Increasing the minimum wage will lead to a 5% decrease in teenage employment.'' A normative statement: ''The minimum wage should be increased to ensure a living wage for all workers.''"}, {"title": "Real vs. Nominal Prices", "explanation": "Nominal price is the ''sticker price'' or the absolute value of a good in current currency. However, because inflation erodes purchasing power over time, economists use Real Prices to compare the value of goods across different years. Real prices are adjusted for inflation using an aggregate price index like the Consumer Price Index (CPI), allowing us to see if a product has actually become more expensive relative to other goods.", "example": "If a liter of milk cost Rs 10 in 2000 and costs Rs 50 today, the nominal price increased 5x. But if the overall cost of living (CPI) also increased 5x, the ''real price'' of milk has remained exactly the same."}, {"title": "Market Structure and Power", "explanation": "Market structure refers to the organizational characteristics of a market, primarily defined by the number of buyers and sellers and the degree of product differentiation. In Perfectly Competitive markets, firms are ''price takers'' because no single entity can influence the market price. In Noncompetitive markets (like Monopolies or Oligopolies), firms have ''market power,'' allowing them to influence prices through supply control or branding.", "example": "Wheat farming is close to perfect competition (many sellers, identical product), whereas OPEC (a cartel) represents a noncompetitive structure where a group of producers controls global oil prices."}, {"title": "Theory of the Firm", "explanation": "This theory assumes that firms operate under constraints (limited budget, technology, and capacity) and aim to maximize profits. It describes the trade-offs firms must make: for instance, choosing between labor-intensive or capital-intensive production. It provides the logic for how firms determine ''how much'' to produce and ''at what price'' to sell to achieve optimal efficiency.", "example": "An electronics manufacturer must decide whether to build a new automated factory (high fixed cost, low variable cost) or hire more manual assembly workers (low fixed cost, high variable cost) based on their production targets."}]','# Masterclass Revision Notes: Fundamentals of Managerial Economics

## 1. The Core Mission: Managing Scarcity
**Core Mental Model**: Think of a Product Manager as a chef with a limited pantry. You have a fixed amount of ingredients (Resources), a ticking clock (Time), and a specific number of guests to feed (Market). Managerial Economics is the ''recipe book'' that tells you how to combine these limited inputs to create the most ''profitable'' meal possible.

**Deep Mechanism**: Economics is the study of **Allocation**. Because resources are finite but human wants are infinite, we face **Trade-offs**. 
- **Consumers** trade off current consumption for future savings.
- **Firms** trade off producing Product A vs. Product B based on capacity constraints.

## 2. The Market Ecosystem
**Market Definition**: It isn''t just a physical place; it is the collection of buyers and sellers whose interactions determine the price of a product.

### Types of Markets
1. **Perfectly Competitive**: 
   - *Mechanism*: So many players exist that no one has ''Market Power.'' Everyone is a **Price Taker**.
   - *Analogy*: A single grain of sand cannot change the shape of the beach.
2. **Noncompetitive (Monopoly/Oligopoly)**:
   - *Mechanism*: A few firms (or one) control a large share. They are **Price Makers**.
   - *Example*: **OPEC** (Organization of the Petroleum Exporting Countries) acts as a **Cartel**, coordinating supply to dictate global oil prices.

## 3. Economic Analysis: Positive vs. Normative
**Exam Trap**: Students often confuse these. Remember: **P**ositive = **P**rediction/Facts. **N**ormative = **N**ice-to-have/Values.
- **Positive Analysis**: "If the price of petrol rises by 10%, SUV sales will drop by 5%." (Testable, objective).
- **Normative Analysis**: "The government should subsidize electric vehicles to save the planet." (Subjective, based on ethics).

## 4. Numerical Masterclass: Real vs. Nominal Prices
To compare prices from different years, we must remove the ''noise'' of inflation.

**The Formula**:
$$\text{Real Price}_{Year B} = \frac{CPI_{Year A}}{CPI_{Year B}} \times \text{Nominal Price}_{Year B}$$
*(Note: This calculates the price of Year B in terms of Year A''s purchasing power)*.

**Step-by-Step Worked Example**:
- **Scenario**: In 2000 (Base Year), Rice was Rs 7/kg. In 2020, Rice is Rs 40/kg. 
- **Data**: $CPI_{2000} = 100$; $CPI_{2020} = 800$.
- **Question**: Is rice actually more expensive today in ''real'' terms?
- **Calculation**:
  1. $\text{Real Price} = (100 / 800) \times 40$
  2. $\text{Real Price} = 0.125 \times 40$
  3. $\text{Real Price} = Rs 5$
- **Insight**: Even though the nominal price jumped from Rs 7 to Rs 40, the **Real Price** (in 2000 rupees) is only Rs 5. Rice is actually *cheaper* now than it was in 2000 when adjusted for inflation!

## 5. The Circular Flow Model
**Diagram Breakdown**:
- **Top Loop (Product Market)**: Households give Money (Revenue) to Firms; Firms give Goods/Services to Households.
- **Bottom Loop (Resource Market)**: Households give Resources (Labor/Capital) to Firms; Firms give Money (Wages/Rent/Profit) to Households.
- **Key Takeaway**: The economy is a closed loop. A disruption in the labor market (bottom) inevitably affects the goods market (top).

## 💡 Top-Ranker Exam Secrets
- **The ''Market'' Trap**: When asked to define a market, don''t just mention geography. Mention the **range of products** (substitutes) and the **buyers/sellers**. 
- **Inflation Adjustment**: Always check which year is the ''Base Year.'' The CPI of the base year is usually 100. 
- **Decision Inputs**: For a Product Manager, ''Technology'' and ''Capacity'' are internal constraints, while ''Regulation'' and ''Market Structure'' are external constraints.','2026-11-04 19:57:28','gemini-3-flash-preview');
CREATE TABLE study_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_id INTEGER,
                    duration_seconds INTEGER NOT NULL,
                    session_type TEXT NOT NULL DEFAULT 'pomodoro',
                    notes TEXT,
                    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
                );
CREATE TABLE subjects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0),
                    description TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                , syllabus_text TEXT DEFAULT '');
INSERT INTO "subjects" VALUES(3,'Economics',NULL,'2026-10-29 19:24:21','2026-11-04 18:47:10','Unit 1: Introduction
Unit 2: Markets
Unit 3: Economics');
INSERT INTO "subjects" VALUES(4,'Product Management',NULL,'2026-11-02 18:20:05','2026-11-02 18:20:05','');
CREATE TABLE syllabus_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_id INTEGER NOT NULL,
                    topic_name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    coverage_notes TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                );
CREATE TABLE topics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    subject_id INTEGER NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT,
                    notes_markdown TEXT,
                    sort_order INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
                );
DELETE FROM "sqlite_sequence";
INSERT INTO "sqlite_sequence" VALUES('subjects',4);
INSERT INTO "sqlite_sequence" VALUES('materials',6);
INSERT INTO "sqlite_sequence" VALUES('study_packs',17);
INSERT INTO "sqlite_sequence" VALUES('quiz_questions',85);
INSERT INTO "sqlite_sequence" VALUES('quiz_attempts',5);
INSERT INTO "sqlite_sequence" VALUES('sticky_notes',3);
INSERT INTO "sqlite_sequence" VALUES('calendar_events',5);
COMMIT;
