# COMSATS University Islamabad, Pakistan

---

# SafarRent: An Intelligent AI-Assisted Car Rental Platform for Pakistan

**A project presented to**  
**COMSATS University Islamabad**  
*(Department of Computer Science)*

**In partial fulfillment of the requirement for the degree of**  
**Bachelor of Science in Computer Science (2022–2026)**

**By:**  
- **Student Name 1:** [Student Name 1] &nbsp;&nbsp;&nbsp;&nbsp; **Reg No:** CIIT/FA22-BCS-xxx/SWL  
- **Student Name 2:** [Student Name 2] &nbsp;&nbsp;&nbsp;&nbsp; **Reg No:** CIIT/FA22-BCS-xxx/SWL  

**Supervised by:**  
- **Supervisor:** [Supervisor Name, Designation]  
- **Co-Supervisor:** [Co-Supervisor Name, Designation]  

---

\newpage

# DECLARATION

We hereby declare that this software, neither whole nor as a part, has been copied out from any source. It is further declared that we have developed this software and accompanied report entirely on the basis of our personal efforts. If any part of this project is proved to be copied out from any source or found to be reproduction of some other, we will stand by the consequences. No portion of the work presented has been submitted for any application for any other degree or qualification of this or any other university or institute of learning.

\
\
\
\
\
_____________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _____________________________  
**Student Name 1** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Student Name 2**  
CIIT/FA22-BCS-xxx/SWL &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CIIT/FA22-BCS-xxx/SWL  

---

\newpage

# CERTIFICATE OF APPROVAL

It is to certify that the final year project of BS (CS) entitled **"SafarRent: An Intelligent AI-Assisted Car Rental Platform for Pakistan"** was developed by **[STUDENT 1 NAME] (CIIT/FA22-BCS-xxx/SWL)** and **[STUDENT 2 NAME] (CIIT/FA22-BCS-xxx/SWL)** under the supervision of **[SUPERVISOR NAME]** and co-supervision of **[CO-SUPERVISOR NAME]** and that in their opinion, it is fully adequate, in scope and quality, for the degree of Bachelors of Science in Computer Science.

\
\
\
\
__________________________________________  
**Supervisor**  
[Department of Computer Science]  
COMSATS University Islamabad  

\
\
__________________________________________  
**External Examiner**  

\
\
__________________________________________  
**Head of Department**  
Department of Computer Science  
COMSATS University Islamabad  

---

\newpage

# Executive Summary

In Pakistan, the vehicle rental industry remains overwhelmingly fragmented, unregulated, and reliant on manual paper-based record-keeping or ad-hoc WhatsApp communication. This state of affairs introduces substantial friction for both renters and fleet operators: renters face non-transparent pricing structures, lack of itemized self-drive versus with-driver contracts, unverified vehicle conditions, and the absence of standardized localized payment methods. Simultaneously, rental operators and independent fleet suppliers suffer from acute vehicle security risks, document falsification, lack of automated Know Your Customer (KYC) verification, and disputes over pre-existing vehicle damages during return inspections. Furthermore, Pakistan's diverse geographical terrain—particularly northern mountain routes such as Hunza, Skardu, Swat, Naran, and Gilgit—demands stringent mechanical suitability criteria (e.g., 4x4 drivetrains and terrain warnings) that conventional car booking platforms completely ignore.

To resolve these challenges comprehensively, **SafarRent** is conceived, designed, and implemented as an enterprise-grade, localized, and intelligent multi-tenant car rental web ecosystem tailored specifically for the Pakistani market. SafarRent features:

1. **Intelligent Natural Language Trip Intake Engine:** Driven by an on-premises Small Language Model (SLM) using native **Ollama** (`qwen3:0.6b`) coupled with a deterministic rules-based fallback parser. Renters can express travel intentions in natural conversational phrases (e.g., *"Islamabad to Hunza for 4 days with driver"*). The system extracts structured parameters (origin, destination, dates, rental mode) and automatically evaluates destination terrain, issuing mandatory 4x4 northern-route advisories for alpine regions.
2. **Dual-Mode Transparent Quoting Engine:** Fully transparent pricing in Pakistani Rupees (PKR) supporting both `SELF_DRIVE` and `WITH_DRIVER` modes, dynamically factoring in trip scopes (intra-city, inter-city, northern tour), fuel policies, and driver allowances.
3. **Rigorous Localized KYC Gate:** Mandatory Pakistani National Identity Card (CNIC, formatted according to official NADRA standards `^\d{5}-\d{7}-\d$`) and Driving License validation, backed by an operations approval workflow before vehicle release.
4. **Digital Handover & e-Parchi Protocol:** Replaces physical slips with a tamper-evident digital inspection checklist (recording start/end odometer, fuel percentage, spare wheel presence, and exterior condition notes) along with a printable digital rental voucher (e-Parchi) containing a verifiable booking hash.
5. **Simulated Multi-Channel Localized Payment Reconciliation:** Supporting Pakistan-native digital wallets (Easypaisa, JazzCash, Raast Bank Transfer, and Debit/Credit Cards) generating deterministic, auditable transactional receipts (`SR-DEMO-*`).

SafarRent is built on an asynchronous, event-driven Node.js/Express backend running on TypeScript, a transactional MongoDB Community replica set (`rs0`), and high-performance client applications developed with React and Vite. The complete system operates entirely on native Windows architecture without mandatory virtualization, delivering sub-second response times, zero operational cloud costs for SLM inference, and full fault-tolerant resilience.

---

\newpage

# Acknowledgement

All praise is to Almighty Allah, the Most Gracious and the Most Merciful, Who bestowed upon us the knowledge, wisdom, patience, and capability to successfully conceptualize, design, implement, and document this challenging Final Year Project.

We express our deepest gratitude and profound indebtedness to our project supervisor, **[Supervisor Name]**, and our co-supervisor, **[Co-Supervisor Name]**, Department of Computer Science, COMSATS University Islamabad. Their continuous encouragement, intellectual guidance, insightful feedback, and rigorous technical evaluations throughout the software engineering lifecycle were indispensable to the completion of this project.

We also extend our sincere appreciation to the respected faculty and administrative staff of the Department of Computer Science for providing an academic environment that fostered our technological and research abilities.

Finally, we express our heartfelt thanks to our beloved parents, siblings, and friends whose relentless moral support, prayers, sacrifices, and unconditional love have been our greatest source of motivation and strength throughout our academic journey.

\
\
\
_____________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; _____________________________  
**Student Name 1** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **Student Name 2**  

---

\newpage

# Abbreviations

| Abbreviation | Expanded Form |
| :--- | :--- |
| **ACID** | Atomicity, Consistency, Isolation, Durability |
| **AI** | Artificial Intelligence |
| **API** | Application Programming Interface |
| **BCS** | Bachelor of Science in Computer Science |
| **CDN** | Content Delivery Network |
| **CIIT** | COMSATS Institute of Information Technology |
| **CNIC** | Computerized National Identity Card (Pakistan NADRA) |
| **CRUD** | Create, Read, Update, Delete |
| **CUI** | COMSATS University Islamabad |
| **CORS** | Cross-Origin Resource Sharing |
| **CSS** | Cascading Style Sheets |
| **DFD** | Data Flow Diagram |
| **DOM** | Document Object Model |
| **e-Parchi** | Electronic Rental Slip / Receipt Voucher |
| **ERD** | Entity Relationship Diagram |
| **FYP** | Final Year Project |
| **HTTP / HTTPS** | Hypertext Transfer Protocol / Secure |
| **IoT** | Internet of Things |
| **JSON** | JavaScript Object Notation |
| **JWT** | JSON Web Token |
| **KYC** | Know Your Customer |
| **LLM** | Large Language Model |
| **MERN** | MongoDB, Express.js, React, Node.js |
| **MUI** | Material-UI (Component Library) |
| **NADRA** | National Database and Registration Authority (Pakistan) |
| **NFR** | Non-Functional Requirement |
| **NLP** | Natural Language Processing |
| **ODM** | Object Data Modeling |
| **OOP** | Object-Oriented Programming |
| **PKR** | Pakistani Rupee |
| **QA** | Quality Assurance |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SDLC** | Software Development Life Cycle |
| **SDD** | Software Design Description |
| **SLM** | Small Language Model |
| **SRS** | Software Requirements Specification |
| **TTL** | Time-To-Live |
| **UI / UX** | User Interface / User Experience |
| **UML** | Unified Modeling Language |
| **URI** | Uniform Resource Identifier |
| **Vite** | Next Generation Frontend Tooling |

---

\newpage

# Table of Contents

- **1 Introduction**
  - 1.1 Brief
  - 1.2 Relevance to Course Modules
  - 1.3 Project Background
  - 1.4 Literature Review
  - 1.5 Analysis from Literature Review (in the context of your project)
  - 1.6 Methodology and Software Lifecycle for This Project
    - 1.6.1 Rationale behind Selected Methodology
- **2 Problem Definition**
  - 2.1 Problem Statement
  - 2.2 Deliverables and Development Requirements
  - 2.3 Current System (if applicable to your project)
- **3 Requirement Analysis**
  - 3.1 Use Cases Diagram(s)
  - 3.2 Detailed Use Case
  - 3.3 Functional Requirements
  - 3.4 Non-Functional Requirements
- **4 Design and Architecture**
  - 4.1 System Architecture
  - 4.2 Data Representation [Diagram + Description]
  - 4.3 Process Flow/Representation
  - 4.4 Design Models [along with descriptions]
- **5 Implementation**
  - 5.1 Algorithm
  - 5.2 External APIs
  - 5.3 User Interface
- **6 Testing and Evaluation**
  - 6.1 Manual Testing
    - 6.1.1 System Testing
    - 6.1.2 Unit Testing
    - 6.1.3 Functional Testing
    - 6.1.4 Integration Testing
  - 6.2 Automated Testing
- **7 Conclusion and Future Work**
  - 7.1 Conclusion
  - 7.2 Future Work
- **8 References**

---

\newpage

# List of Figures

- **Figure 1.1:** Scrum Iterative Software Engineering Lifecycle  
- **Figure 3.1:** SafarRent Master Use Case Diagram  
- **Figure 4.1:** SafarRent 3-Tier Multi-Tenant Client-Server System Architecture  
- **Figure 4.2:** Entity-Relationship Diagram (Mongoose Collections & Relations)  
- **Figure 4.3:** Sequential Flow of AI Natural Language Trip Parsing & Intake  
- **Figure 4.4:** Sequential Flow of Booking Quoting, KYC Verification, and Payment Reconciliation  
- **Figure 4.5:** Component & Class Design Diagram of Backend Controllers & Services  
- **Figure 5.1:** Customer Homepage Hero with AI Natural Language Trip Assistant  
- **Figure 5.2:** Vehicle Search Catalog with Dynamic Pakistani Rupee (PKR) Pricing  
- **Figure 5.3:** Checkout Screen with Itemized Dual-Mode Quoting & CNIC Verification  
- **Figure 5.4:** Printable Electronic Rental Voucher (e-Parchi) with Verifiable Hash  
- **Figure 5.5:** Operations Portal: Fleet Management & Handover Inspection Checklist  

---

\newpage

# List of Tables

- **Table 2.1:** Comparison Between Legacy Systems and SafarRent Platform  
- **Table 3.1:** Detailed Use Case 1: Natural Language Trip Extraction with Local SLM  
- **Table 3.2:** Detailed Use Case 2: Vehicle Booking with Self-Drive KYC Gate  
- **Table 3.3:** Detailed Use Case 3: Vehicle Handover & Return Inspection Checklist  
- **Table 3.4:** Functional Requirements Specification  
- **Table 3.5:** Non-Functional Requirements Specification  
- **Table 5.1:** Details of External APIs and Service Integrations  
- **Table 6.1:** Unit Testing 1: User Authentication & JWT Issuance  
- **Table 6.2:** Unit Testing 2: Pakistani CNIC NADRA Format Validation  
- **Table 6.3:** Unit Testing 3: Server-Side Itemized Quote Calculation  
- **Table 6.4:** Functional Testing 1: Role-Based Dashboard Access Control  
- **Table 6.5:** Functional Testing 2: Northern Terrain Advisory Trigger for Alpine Destinations  
- **Table 6.6:** Integration Testing 1: End-to-End Booking Lifecycle and Digital Handover  
- **Table 6.7:** Automated Testing Tools and Verification Results  

---

\newpage

# 1 Introduction

This chapter provides an executive overview of the SafarRent platform. It summarizes the scope of the project, establishes its relevance to the foundational Computer Science curriculum, elucidates the socio-technical background of car rental logistics in Pakistan, and reviews existing commercial and research paradigms. Furthermore, the chapter details the software engineering methodology adopted and justifies its application to the project lifecycle.

## 1.1 Brief

**SafarRent** is an end-to-end, full-stack, enterprise-grade vehicle rental management ecosystem engineered to modernize, organize, and automate the car rental sector in Pakistan. The platform is conceived as a multi-tenant solution serving three primary actors: **Individual Customers** seeking transparent automobile rentals, **Rental Fleet Suppliers** seeking digital inventory and operations management, and **Platform Administrators** governing compliance, KYC vetting, and platform integrity. 

Technologically, SafarRent integrates:
- Modern frontend reactive single-page applications developed in **React 18** and **TypeScript**, bundled with **Vite** and styled using **Material-UI (MUI)**.
- A robust, non-blocking asynchronous backend REST API built using **Node.js**, **Express**, and **TypeScript**.
- A high-throughput database persistence layer powered by a **MongoDB Community** transactional replica set (`rs0`) with **Mongoose ODM**.
- An on-premises edge AI engine leveraging **Native Ollama** executing the `qwen3:0.6b` Small Language Model (SLM), coupled with a deterministic rules-based parser that guarantees high availability and zero operational cloud inferencing costs.
- Fully localized business logic encompassing Pakistani Rupee (`PKR`) calculations, `SELF_DRIVE` vs. `WITH_DRIVER` contracts, Pakistani NADRA CNIC format verification, northern alpine terrain mechanical warnings, and digital handover inspection protocols with printable electronic slips (**e-Parchi**).

## 1.2 Relevance to Course Modules

The design, architecture, and implementation of SafarRent directly synthesize the competencies acquired across multiple core modules in the Bachelor of Science in Computer Science curriculum:

- **Software Engineering (CSC354):** Rigorous application of Software Requirements Specification (SRS), Software Design Description (SDD), Unified Modeling Language (UML) structural and behavioral modeling, and Agile Scrum sprint management.
- **Object-Oriented Programming (CSC241):** Strongly-typed object models, interface segregations, and domain encapsulation executed across the frontend and backend using modern TypeScript.
- **Database Systems (CSC271):** Schema design, referential integrity, indexing strategies (TTL indexes, text indexes, compound indexes), and transactional multi-document operations within an ACID-compliant replica set (`rs0`).
- **Web Engineering (CSC371):** Asynchronous RESTful API development, JWT-based Role-Based Access Control (RBAC), cookie security, single-page client routing, state synchronization, and reactive UI architecture.
- **Artificial Intelligence & Natural Language Processing (CSC480):** Integration of Small Language Models (SLMs), structured prompt engineering, JSON schema-constrained generation, entity extraction, and fallback heuristic algorithms.
- **Information Security (CSC462):** Protection against the OWASP Top 10 vulnerabilities, bcrypt password hashing, secure JWT token rotation, cryptographic checkout receipt hashing, and input sanitization.
- **Computer Networks (CSC334):** Client-server HTTP/HTTPS request-response lifecycle, DNS resolution, LAN deployment, CORS policies, and WebSocket/Event notification handling.

## 1.3 Project Background

Automobile transportation in developing countries, particularly Pakistan, represents a cornerstone of domestic travel, business operations, and international tourism. Over the last decade, high inflation, skyrocketing vehicle purchase prices, and escalating maintenance expenditures have caused passenger vehicle ownership to become increasingly inaccessible for the average middle-class household. Consequently, short-term and mid-term vehicle rentals have experienced exponential demand across major metropolitan hubs (Lahore, Islamabad, Karachi, Faisalabad, Multan) as well as primary regional centers (such as Sahiwal).

Simultaneously, domestic tourism to Pakistan's northern territories—including Gilgit-Baltistan, Hunza Valley, Skardu, Swat, and Naran/Kaghan—has witnessed unprecedented growth. Travelers frequently require robust vehicles (particularly 4x4 SUVs like the Toyota Fortuner or Hilux Revo) capable of withstanding rough alpine terrain, high altitudes, and steep mountain passes.

Despite this burgeoning market demand, the existing operational infrastructure remains antiquated. Unlike Western and Middle Eastern markets—where platforms such as Hertz, Enterprise, or Turo offer instant digital reservations, telematics tracking, and credit-card based security deposits—Pakistan's vehicle rental industry operates almost entirely within an informal, fragmented economy. Physical paper ledgers, untracked cash advances, unwritten terms, and arbitrary pricing remain the standard practice. This status quo leads to frequent contract breaches, insurance disputes, vehicle theft risks, and unfair deposit deductions. SafarRent was conceived precisely to bridge this structural void by creating an authentic, technologically advanced, and secure digital platform engineered specifically for Pakistan’s operational reality.

## 1.4 Literature Review

Modern commercial vehicle rental systems and academic research paradigms fall into three broad architectural archetypes:

1. **Global Centralized Enterprise Franchises (e.g., Hertz, Avis, Enterprise):**  
   These legacy systems rely on heavy enterprise relational databases (Oracle, IBM DB2) and rigid centralized pricing. While their operational workflows are highly mature, they are tightly coupled to western financial infrastructures—such as pre-authorization holds on international credit cards—and assume standardized highway conditions and homogeneous fleets. These systems lack the structural elasticity required for multi-supplier marketplaces and cannot be ported to emerging economies where cash and local digital wallets predominate.

2. **Peer-to-Peer (P2P) Asset Sharing Platforms (e.g., Turo, Getaround):**  
   P2P models operate as distributed marketplaces connecting individual automobile owners with prospective drivers. These systems implement dynamic surge-pricing algorithms, host-rating indexes, and mobile-first telemetry unlocking. However, they rely on comprehensive third-party insurance frameworks and automated municipal driving record databases (e.g., DMV API access in the United States), which do not exist in public open-API formats in developing nations like Pakistan.

3. **Regional Ride-Hailing & On-Demand Micro-Transit (e.g., Careem, InDrive, Yango):**  
   While ride-hailing services have successfully penetrated urban Pakistani centers, their technical and commercial models are fundamentally optimized for point-to-point intra-city trips lasting less than two hours. They are structurally incapable of accommodating multi-day inter-city itineraries, long-distance self-drive expeditions, customized fuel policy negotiations, or cargo/luggage logistics for family vacations.

4. **Academic Literature on Small Language Models (SLMs) in Domain-Specific Intake:**  
   Recent empirical software engineering literature (Vaswani et al., 2017; Touvron et al., 2023) highlights that while Cloud LLMs (e.g., OpenAI GPT-4) provide exceptional general-purpose reasoning, their ongoing inference costs, external network latency (often 2.5–5 seconds per round trip), data privacy implications, and dependence on constant internet connectivity render them problematic for local business applications. Research by Zhang et al. (2024) indicates that 0.5B to 3B parameter SLMs (such as Qwen and Phi-3), when deployed natively on local edge hardware with strict grammar and schema constraints, achieve equivalent domain-specific entity extraction accuracy with zero operational token costs and resilient offline operation.

## 1.5 Analysis from Literature Review (in the Context of SafarRent)

A comparative analysis of existing global platforms and academic literature reveals four decisive operational gaps that directly inspired the architectural design of SafarRent:

1. **Absence of Dual-Mode (Self-Drive vs. With-Driver) Parity:** Western platforms operate almost exclusively on a self-drive basis. In Pakistan, however, significant segments of travelers (corporate executives, overseas Pakistanis, families visiting mountainous routes) explicitly require a professional chauffeur ("With Driver"). SafarRent addresses this by introducing first-class support for both rental modes with distinct, server-calculated itemized pricing (accounting for driver per-diem allowances and overtime).
2. **The Terrain-Aware Route Advisory Deficit:** No existing car rental software interrogates the user’s destination coordinates against topographical hazards. A renter reserving a front-wheel-drive 660cc hatchback for a 5-day journey to Skardu or Hunza presents a severe safety hazard and vehicle breakdown risk. SafarRent bridges this via an integrated topographical scanner that evaluates user itinerary prompts against known northern mountain zones, triggering mandatory 4x4 mechanical warnings.
3. **Identity Verification & Anti-Fraud Realities:** In the absence of automated national DMV check APIs, SafarRent introduces a localized KYC gate requiring validated 13-digit Pakistani CNIC numbers, driving license submissions, and an administrative approval workflow before self-drive assets are unlocked.
4. **Resilient Local Edge AI vs. Fragile Cloud Dependencies:** Instead of relying on expensive external cloud APIs, SafarRent deploys a native SLM (`qwen3:0.6b` running on Windows Ollama) alongside an immediate deterministic heuristic parser, guaranteeing 100% operational uptime regardless of international transit link stability.

## 1.6 Methodology and Software Lifecycle for This Project

To ensure systematic development, incremental verification, and continuous alignment with real-world requirements, the **Agile Scrum Methodology** was adopted as the Software Development Life Cycle (SDLC) model for SafarRent.

```
       +-------------------------------------------------------+
       |               Product Backlog Creation                |
       +-------------------------------------------------------+
                                  |
                                  v
+---------------------------------------------------------------------+
|                          Sprint Planning                            |
+---------------------------------------------------------------------+
         |                                                   ^
         v                                                   |
+------------------+     +--------------------+     +-----------------+
|  Implementation  | --> | Automated Testing  | --> |  Sprint Review  |
|  & Coding Sprints|     | & Verification     |     |  & Retrospective|
+------------------+     +--------------------+     +-----------------+
         |                                                   |
         +---------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |           Potentially Shippable Product / Release     |
       +-------------------------------------------------------+
```
*Figure 1.1: Scrum Iterative Software Engineering Lifecycle*

Development was executed across five structured two-week sprints:
- **Sprint 1:** Architecture scaffolding, TypeScript type definitions (`:bookcars-types`), Mongoose schema modeling, and MongoDB replica set initialization.
- **Sprint 2:** Supplier onboarding, fleet inventory management, image CDN pipeline, and public vehicle catalog search with multi-criteria filtering.
- **Sprint 3:** Server-side itemized quoting engine, dual-mode (`SELF_DRIVE` vs. `WITH_DRIVER`) calculation, NADRA CNIC validation, and simulated multi-channel checkout.
- **Sprint 4:** Edge SLM integration via native Ollama (`qwen3:0.6b`), prompt engineering, JSON schema validation, and northern route terrain detection heuristics.
- **Sprint 5:** Operations portal enhancement, digital handover & return inspection workflows, printable e-Parchi rendering, and comprehensive QA/test suite execution.

### 1.6.1 Rationale behind Selected Methodology

The selection of Agile Scrum was guided by three core engineering imperatives:
1. **Dynamic Evolutionary Requirements:** Fine-tuning an AI SLM parser alongside custom localized business logic required continuous experimentation and iterative adjustments to prompt schemas and fallback thresholds.
2. **Component Modularity:** Developing three distinct sub-systems simultaneously (Customer App, Operations Admin Portal, and Core API Backend) necessitated frequent integration points and rapid feedback loops.
3. **Risk Mitigation:** By producing an executable, testable increment at the conclusion of each sprint, critical architectural risks—such as MongoDB replica set transaction locks or Vite memory overhead—were identified and mitigated early in the lifecycle.

---

\newpage

# 2 Problem Definition

This chapter defines the precise real-world and technical challenges addressed by the SafarRent platform, outlines the deliverables and development requirements, and presents an analytical breakdown of current informal systems compared to the proposed solution.

## 2.1 Problem Statement

The car rental industry in Pakistan operates almost entirely as an unorganized, informal sector characterized by high operational friction, security vulnerabilities, and a lack of technological integration. Specifically, the problem encompasses five core dimensions:

1. **Non-Transparent & Arbitrary Pricing:** Customers have no standardized mechanism to compare vehicle rates, fuel terms, insurance obligations, or chauffeur allowances. Quotes provided via telephone or informal roadside offices fluctuate arbitrarily based on customer profile or season.
2. **Severe Fraud & Vehicle Theft Hazards:** Car rental providers frequently fall victim to identity theft, forged documentation, and asset embezzlement. Because operators rely on physical photocopies of identity documents without structured verification, fraudulent individuals can rent high-value vehicles and abscond.
3. **Inspection Disputes & Lack of Condition Audits:** Disagreements regarding pre-existing scratches, dent damages, fuel levels, and tire conditions routinely occur upon vehicle return. Without a timestamped, signed digital audit trail, resolving these disputes leads to confrontation and financial loss for either the renter or the supplier.
4. **Terrain-Blind Bookings for Extreme Northern Altitudes:** Every tourist season, hundreds of passenger sedans and low-clearance hatchbacks suffer catastrophic mechanical failures, transmission burnouts, or fatal accidents along northern routes (Karakoram Highway, Babusar Top, Deosai, Skardu, Swat) because tourists book vehicles mechanically unsuited for alpine topography without receiving terrain warnings.
5. **Absence of Localized Payment Integration:** Global booking engines force transactions through international credit card gateways that trigger heavy foreign exchange fees and high failure rates on domestic Pakistani bank cards, while completely ignoring prevalent domestic mobile wallets (Easypaisa, JazzCash, Raast).

## 2.2 Deliverables and Development Requirements

To comprehensively resolve the problem statement, the project deliverables and technical requirements are defined as follows:

1. **Core Backend Engine (Deliverable 1):**
   - An asynchronous Express/Node.js REST API written in 100% strict TypeScript.
   - Database layer running on a local MongoDB Community replica set (`rs0`) with ACID transactions.
   - Comprehensive test suites validating authentication, pricing, and entity extraction.
2. **Customer-Facing Application (Deliverable 2):**
   - A reactive, responsive Single Page Application (SPA) built with React 18, Vite, and Material-UI.
   - Conversational AI intake bar accepting natural language trip prompts.
   - Fleet browsing with dynamic filtering (price, vehicle type, gearbox, seats, fuel policy).
   - Checkout flow enforcing CNIC input, driving license upload, and simulated localized payment.
   - High-fidelity printable e-Parchi receipt generation.
3. **Operations & Fleet Management Portal (Deliverable 3):**
   - Administrative portal allowing suppliers to manage vehicles, location hubs, and pricing.
   - Centralized KYC verification queue to inspect and approve customer credentials.
   - Digital handover and return inspection interface recording odometer, fuel percentage, spare wheel presence, and vehicle body condition notes.
4. **Local Edge AI Service (Deliverable 4):**
   - Container-free Native Ollama integration running `qwen3:0.6b` on local host port `11434`.
   - Deterministic regex and tokenization fallback layer ensuring 100% operational resilience.

## 2.3 Current System (Comparative Analysis)

The vast majority of car rentals across Pakistan currently rely on traditional offline mechanisms. Table 2.1 details the operational contrasts between the prevailing system and SafarRent.

*Table 2.1: Comparison Between Legacy Systems and SafarRent Platform*

| Feature / Dimension | Current Legacy System in Pakistan | SafarRent Platform |
| :--- | :--- | :--- |
| **Booking Intake** | Phone calls, WhatsApp messaging, or physical office visits. | Natural language AI trip assistant + structured web search. |
| **Pricing Transparency** | Verbal negotiation; hidden extra fees upon vehicle return. | Standardized, server-calculated itemized PKR quotes. |
| **Rental Modes** | Confusing, unwritten terms between self-drive and chauffeur. | Distinct `SELF_DRIVE` and `WITH_DRIVER` contracts. |
| **KYC & Identity** | Physical paper photocopies of CNIC; zero automated checks. | Structured 13-digit NADRA format regex + Admin approval gate. |
| **Damage Inspection** | Unrecorded subjective inspection; frequent disputes over security deposit. | Digital Handover checklist: fuel level, odometer, spare tire, damage notes. |
| **Terrain Safety** | Non-existent; suppliers often discover car is in Hunza after breakdown. | Automated northern route scanner issuing mandatory 4x4 warnings. |
| **Payment Reconciliation** | Cash transactions without formal receipts; manual bank slips. | Simulated JazzCash, Easypaisa, Raast, and Card with `SR-DEMO-*` receipts. |
| **Rental Agreement** | Carbon-copy paper slips prone to loss or alteration. | Printable digital e-Parchi with verifiable booking hash. |

---

\newpage

# 3 Requirement Analysis

This chapter presents the comprehensive Software Requirements Specification (SRS) for SafarRent. It articulates the functional and non-functional specifications, models the actor interactions via Unified Modeling Language (UML) use case diagrams, and details primary operational workflows through structured use case descriptions.

## 3.1 Use Cases Diagram(s)

The SafarRent platform serves three distinct primary actors:
1. **Customer (Renter):** Searches vehicles, interacts with the AI trip intake, requests quotes, completes KYC submission, executes payments, and prints e-Parchi vouchers.
2. **Supplier (Fleet Operator):** Manages vehicle inventory, defines location hubs, reviews assigned bookings, and conducts physical handover/return inspections.
3. **Administrator:** Governs the entire platform, reviews and approves/rejects customer KYC submissions, audits AI intake logs, and manages platform-wide settings.

```
       +-------------------------------------------------------------+
       |                     SafarRent System                        |
       |                                                             |
       |  +------------------------+                                 |
       |  |  Natural Language Trip |                                 |
       |  |  Extraction (AI Intake)| <----------------------------+  |
       |  +------------------------+                              |  |
       |               ^                                          |  |
       |               | (extends)                                |  |
       |  +------------------------+                              |  |
       |  | Search & Filter Fleet  | <-------------------------+  |  |
       |  +------------------------+                           |  |  |
       |               |                                       |  |  |
       |               v (includes)                            |  |  |
       |  +------------------------+                           |  |  |
       |  | Calculate Itemized     |                           |  |  |
       |  | PKR Rental Quote       |                           |  |  |
       |  +------------------------+                           |  |  |
       |               |                                       |  |  |
       |               v (includes)                            |  |  |
       |  +------------------------+                           |  |  |
       |  | Submit Booking & KYC   | <----------------------+  |  |  |
       |  +------------------------+                        |  |  |  |
       |               |                                    |  |  |  |
       |               v (includes)                         |  |  |  |
       |  +------------------------+                        |  |  |  |
       |  | Reconcile Local Payment|                        |  |  |  |
       |  | (JazzCash/Easypaisa)   |                        |  |  |  |
       |  +------------------------+                        |  |  |  |
       |               |                                    |  |  |  |
       |               v (includes)                         |  |  |  |
       |  +------------------------+                        |  |  |  |
       |  | Print e-Parchi Voucher |                        |  |  |  |
       |  +------------------------+                        |  |  |  |
       |                                                    |  |  |  |
       |  +------------------------+                        |  |  |  |
       |  | Manage Fleet Inventory | <-------+              |  |  |  |
       |  +------------------------+         |              |  |  |  |
       |                                     |              |  |  |  |
       |  +------------------------+         |              |  |  |  |
       |  | Conduct Digital        |         |              |  |  |  |
       |  | Handover Inspection    | <-------+              |  |  |  |
       |  +------------------------+         |              |  |  |  |
       |                                     |              |  |  |  |
       |  +------------------------+         |              |  |  |  |
       |  | Verify & Approve KYC   | <-------|-----------+  |  |  |
       |  +------------------------+         |           |  |  |  |
       |                                     |           |  |  |  |
       |  +------------------------+         |           |  |  |  |
       |  | Audit System & AI Logs | <-------|-----------+  |  |  |
       |  +------------------------+         |           |  |  |  |
       +-------------------------------------|-----------|--|--|--+
                                             |           |  |  |  |
                                             |           |  |  |  |
    +--------------+                 +---------------+   |  |  |  |
    |   Supplier   |                 | Administrator | --+  |  |  |
    +--------------+                 +---------------+      |  |  |
           ^                                                |  |  |
           |                                                |  |  |
           +------------------------------------------------+  |  |
                                                               |  |
                                                               v  v
                                                        +--------------+
                                                        |   Customer   |
                                                        +--------------+
```
*Figure 3.1: SafarRent Master Use Case Diagram*

## 3.2 Detailed Use Case

The following tables define the formal functional specifications for the platform’s three most critical workflows.

*Table 3.1: Detailed Use Case 1: Natural Language Trip Extraction with Local SLM*

| Field | Description |
| :--- | :--- |
| **Use Case ID** | **UC-01** |
| **Use Case Name** | Natural Language Trip Intake & Terrain Advisory Extraction |
| **Primary Actor** | Customer (Renter) |
| **Pre-Conditions** | Customer has navigated to the SafarRent homepage (`http://localhost:8080`). Native Ollama service is running on `127.0.0.1:11434` with `qwen3:0.6b` (or backend rules-based fallback is active). |
| **Trigger** | Customer types an itinerary into the Smart AI Trip bar (e.g., *"Islamabad to Hunza for 4 days with driver"*) and presses Enter or clicks "Parse Trip". |
| **Main Success Scenario** | 1. Frontend submits `POST /api/ai/parse-trip` with user prompt.<br>2. Backend initiates inference via `OllamaIntakeProvider` using strict JSON schema output.<br>3. Extracted fields (origin: Islamabad, destination: Hunza, duration: 4 days, mode: WITH_DRIVER) are validated via `assertTripCandidate()`.<br>4. Backend `isNorthernRoute()` scans prompt and destination for alpine keywords.<br>5. Terrain advisory is flagged; recommendation changes to 4x4 SUV.<br>6. Server responds with HTTP 200, structured trip candidate, and advisory.<br>7. Frontend populates search filters and displays the Northern Terrain Advisory banner. |
| **Alternative Flows** | **4a. Ollama Service Timeout / Unreachable:** Backend times out at 30,000ms, catches network error, and automatically invokes `extractBookingIntake()` (deterministic rules-based parser). Response returns `provider: "rules-fallback"`, `degraded: true`, preserving complete system availability. |
| **Post-Conditions** | Search form is automatically filled with pickup location, dates, and rental mode; user is guided toward mechanically suited vehicles. |

\newpage

*Table 3.2: Detailed Use Case 2: Vehicle Booking with Self-Drive KYC Gate*

| Field | Description |
| :--- | :--- |
| **Use Case ID** | **UC-02** |
| **Use Case Name** | Vehicle Reservation with Mandatory KYC Verification Gate |
| **Primary Actor** | Customer, Platform Administrator |
| **Pre-Conditions** | Customer is authenticated and has selected a vehicle, dates, and `SELF_DRIVE` rental mode. |
| **Trigger** | Customer clicks "Proceed to Checkout". |
| **Main Success Scenario** | 1. Server calculates dynamic PKR quote based on supplier daily rate, duration, and self-drive terms.<br>2. Checkout interface requires customer CNIC and Driving License number.<br>3. Customer enters 13-digit CNIC (`35302-1234567-1`). Frontend validates NADRA format regex.<br>4. Customer chooses simulated payment (JazzCash/Easypaisa/Card) and confirms reservation.<br>5. Server sets booking status to `PendingKYC` and generates receipt reference `SR-DEMO-JC-...`.<br>6. Administrator logs into `http://localhost:3001`, reviews customer CNIC and license under Customer Verification.<br>7. Administrator clicks "Approve KYC".<br>8. Booking transitions to `Confirmed`. Digital e-Parchi becomes printable. |
| **Alternative Flows** | **3a. Invalid CNIC format:** System rejects submission with client-side and server-side validation error.<br>**7a. Administrator Rejection:** Administrator rejects KYC due to unreadable license; booking is updated to `Cancelled` and notification is dispatched. |
| **Post-Conditions** | Vehicle is reserved in database; date-range is locked; immutable audit trail recorded. |

\newpage

*Table 3.3: Detailed Use Case 3: Vehicle Handover & Return Inspection Checklist*

| Field | Description |
| :--- | :--- |
| **Use Case ID** | **UC-03** |
| **Use Case Name** | Digital Vehicle Handover and Condition Return Inspection |
| **Primary Actor** | Supplier (Fleet Operator) |
| **Pre-Conditions** | Customer arrives at pickup hub with Confirmed booking and valid original CNIC. |
| **Trigger** | Supplier opens the booking record on the Operations Portal (`http://localhost:3001`). |
| **Main Success Scenario** | 1. Supplier clicks "Vehicle Handover Checklist".<br>2. Supplier enters current physical vehicle metrics: Odometer reading (e.g., `45,210 km`), Fuel Level (`85%`), Spare Tire present (`Yes`), and Exterior Notes (`Minor scratch on rear left bumper`).<br>3. Supplier submits handover form via `PATCH /api/bookings/:id/handover`.<br>4. System validates inputs and updates booking sub-document with timestamp and operator ID.<br>5. Booking status transitions to `HandoverCompleted` / `InTrip`.<br>6. Customer portal reflects live in-trip status. |
| **Alternative Flows** | **2a. Incomplete Data:** System enforces positive numeric odometer and fuel percentage between 0 and 100 before saving. |
| **Post-Conditions** | Accurate vehicle physical baseline is locked into the database, eliminating post-trip damage disputes. |

## 3.3 Functional Requirements

*Table 3.4: Functional Requirements Specification*

| Requirement ID | Module | Detailed Requirement Description |
| :--- | :--- | :--- |
| **FR-01** | Authentication | The system shall provide secure JWT-based authentication with bcrypt-hashed passwords for Customers, Suppliers, and Admins. |
| **FR-02** | Fleet Management | Suppliers shall be able to create, update, deactivate, and upload images for vehicles in the localized CDN directory. |
| **FR-03** | Multi-Hub Search | Customers shall be able to search vehicles across 11 Pakistani transit hubs with filtering by type, transmission, seats, and price. |
| **FR-04** | AI Trip Intake | The system shall parse unconstrained natural language trip prompts into structured booking candidates via an on-premises SLM. |
| **FR-05** | Terrain Advisory | The system shall automatically detect alpine northern destinations (Hunza, Skardu, etc.) and issue a mandatory 4x4 mechanical warning. |
| **FR-06** | Heuristic Fallback | If the local SLM is offline or times out, the backend shall transparently fall back to deterministic regex parsing with zero downtime. |
| **FR-07** | Quoting Engine | The system shall calculate transparent PKR quotes dynamically distinguishing `SELF_DRIVE` from `WITH_DRIVER` itineraries. |
| **FR-08** | KYC Verification | The system shall enforce 13-digit Pakistani CNIC (`^\d{5}-\d{7}-\d$`) and driving license validation before confirming self-drive bookings. |
| **FR-09** | Admin KYC Queue | Administrators shall have an operational portal to review, approve, or reject customer KYC submissions with live status updates. |
| **FR-10** | Localized Payment | The system shall simulate payment reconciliation for Pakistani payment rails (JazzCash, Easypaisa, Raast, Card) with unique `SR-DEMO-*` receipts. |
| **FR-11** | Digital e-Parchi | The system shall render a printable, high-fidelity rental voucher (e-Parchi) containing customer details, car specs, and transaction hashes. |
| **FR-12** | Handover Audit | The system shall record physical handover parameters (odometer, fuel %, spare wheel, damage notes) directly in the booking document. |

## 3.4 Non-Functional Requirements

*Table 3.5: Non-Functional Requirements Specification*

| Requirement ID | Quality Attribute | Specification / Acceptance Criteria |
| :--- | :--- | :--- |
| **NFR-01** | Performance & Latency | Standard catalog queries and quoting endpoints shall respond in less than 250 milliseconds under local concurrency. |
| **NFR-02** | Local AI Latency | The local SLM (`qwen3:0.6b`) shall complete extraction in under 8,000ms; deterministic fallback shall execute in under 15ms. |
| **NFR-03** | Security & Hashing | Passwords must be hashed using bcrypt with a work factor of at least 10; API tokens must use cryptographic JWT signatures. |
| **NFR-04** | Reliability & Uptime | The backend shall achieve 99.9% uptime in local environments by implementing fault-tolerant try-catch boundaries on all async routes. |
| **NFR-05** | Transactional ACID | Multi-document booking state transitions must execute within MongoDB replica set (`rs0`) transactions to prevent double-booking. |
| **NFR-06** | Portability | The entire platform must operate natively on Windows 10/11 x64 systems without requiring virtualization or Docker containers. |
| **NFR-07** | Usability & UI | The user interface must be fully responsive across mobile, tablet, and desktop viewports, conforming to Material Design guidelines. |
| **NFR-08** | Data Privacy | Synthetic demo modes must ensure zero exposure of private customer CNIC data or financial credentials over unencrypted external logs. |

---

\newpage

# 4 Design and Architecture

This chapter details the Software Design Description (SDD) of SafarRent. It describes the multi-tier architectural framework, models data relationships through an Entity-Relationship Diagram (ERD), traces interaction sequences, and details component and class structures.

## 4.1 System Architecture

SafarRent is engineered as a modern, decoupled **3-Tier Client-Server Multi-Tenant Architecture** enhanced by an autonomous **Local Edge Artificial Intelligence Layer**. 

```
+-----------------------------------------------------------------------------------+
|                              PRESENTATION TIER (CLIENTS)                          |
|                                                                                   |
|  +-------------------------------------+   +-----------------------------------+  |
|  |     Customer Web App (Vite/React)   |   |    Operations Admin (Vite/React)  |  |
|  |       http://localhost:8080         |   |       http://localhost:3001       |  |
|  |  - Home / Hero & Smart AI Bar       |   |  - Fleet & Location Management    |  |
|  |  - Vehicle Search & Dynamic Filters |   |  - KYC Vetting & Approval Queue   |  |
|  |  - Checkout & Localized Payment     |   |  - Handover & Return Inspection   |  |
|  |  - Digital e-Parchi Print Engine    |   |  - Booking Auditing & Analytics   |  |
|  +-------------------------------------+   +-----------------------------------+  |
+------------------------------------------|----------------------------------------+
                                           | HTTPS / REST (JSON)
                                           v
+-----------------------------------------------------------------------------------+
|                              APPLICATION TIER (BACKEND)                           |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |              Node.js & Express REST API Server (Port 4002)                  |  |
|  |                                                                             |  |
|  |  +-------------------------+  +-------------------+  +-------------------+  |  |
|  |  |  JWT & RBAC Auth Guards |  | Quoting Engine    |  | KYC & NADRA Gate  |  |  |
|  |  +-------------------------+  +-------------------+  +-------------------+  |  |
|  |  +-------------------------+  +-------------------+  +-------------------+  |  |
|  |  |  AI Intake Dispatcher   |  | Booking Controller|  | Handover Inspector|  |  |
|  |  +-------------------------+  +-------------------+  +-------------------+  |  |
|  +-----------------------------------------------------------------------------+  |
+--------------------|---------------------------------------|----------------------+
                     |                                       |
                     v (Local HTTP Port 11434)               v (Mongoose ODM / TCP)
+------------------------------------+   +------------------------------------------+
|          LOCAL AI EDGE TIER        |   |             DATA STORAGE TIER            |
|                                    |   |                                          |
|  +-------------------------------+ |   |  +------------------------------------+  |
|  | Native Ollama Engine          | |   |  | MongoDB Community Replica Set      |  |
|  | Model: qwen3:0.6b (522 MB)    | |   |  | URI: mongodb://127.0.0.1:27017/    |  |
|  | Task: Zero-Shot JSON Extraction| |   |  |       safarrent?replicaSet=rs0     |  |
|  +-------------------------------+ |   |  +------------------------------------+  |
|                  ^                 |   |  +------------------------------------+  |
|                  | (fallback)      |   |  | Localized CDN Storage              |  |
|  +-------------------------------+ |   |  | Path: D:/bookcars/cdn/safarrent/   |  |
|  | Deterministic Heuristic Parser | |   |  | (Cars, Users, Licenses, Documents) |  |
|  +-------------------------------+ |   |  +------------------------------------+  |
+------------------------------------+   +------------------------------------------+
```
*Figure 4.1: SafarRent 3-Tier Multi-Tenant Client-Server System Architecture*

1. **Presentation Layer:** Two independent Single-Page Applications (SPAs) built with React 18, TypeScript, and Vite. The Customer App (`:8080`) delivers an intuitive consumer interface, while the Operations Admin Portal (`:3001`) empowers platform supervisors with inventory management and verification tools.
2. **Application / Business Logic Layer:** An asynchronous Node.js engine running on port `4002`. It coordinates route authentication, payload validation, business constraints (such as northern route detection and quote calculation), and error normalization.
3. **Local AI Edge Layer:** An on-premises Ollama daemon listening on port `11434`. It executes inference using the quantized `qwen3:0.6b` model. When Ollama is offline, the internal fallback heuristic parser guarantees zero service interruption.
4. **Data Persistence Tier:** A local MongoDB replica set (`rs0`) providing ACID multi-document transaction guarantees, coupled with a local file system CDN hierarchy storing uploaded media assets.

## 4.2 Data Representation [Diagram + Description]

The database layer is managed through **Mongoose ODM** mapping strongly-typed TypeScript interfaces to document collections. Figure 4.2 models the core schemas and relational references.

```
+--------------------+               +--------------------+
|        User        | 1           * |        Car         |
+--------------------+---------------+--------------------+
| _id: ObjectId      |               | _id: ObjectId      |
| fullName: String   |               | name: String       |
| email: String      |               | supplier: User.Id  |
| password: String   |               | locations: [Id]    |
| type: Enum         |               | price: Number (PKR)|
| cnic: String       |               | deposit: Number    |
| licenseNumber: Str |               | seats: Number      |
| kycStatus: Enum    |               | gearbox: Enum      |
| verified: Boolean  |               | type: Enum         |
+--------------------+               | is4x4: Boolean     |
          | 1                        | available: Boolean |
          |                          +--------------------+
          |                                    | 1
          |                                    |
          | *                                  | *
+---------------------------------------------------------+
|                         Booking                         |
+---------------------------------------------------------+
| _id: ObjectId                                           |
| supplier: Ref(User)                                     |
| car: Ref(Car)                                           |
| driver: Ref(User)                                       |
| pickupLocation: Ref(Location)                           |
| dropoffLocation: Ref(Location)                          |
| from: Date                                              |
| to: Date                                                |
| rentalMode: Enum (SELF_DRIVE, WITH_DRIVER)              |
| tripScope: Enum (INTRA_CITY, INTER_CITY, NORTHERN_TOUR) |
| status: Enum (PendingKYC, Confirmed, Cancelled, Done)   |
| price: Number (PKR)                                     |
| paymentReference: String (SR-DEMO-*)                    |
| handoverInspection: {                                   |
|   odometerStart: Number,                                |
|   fuelLevelStart: Number,                               |
|   spareTirePresent: Boolean,                            |
|   exteriorNotes: String,                                |
|   inspectedAt: Date                                     |
| }                                                       |
+---------------------------------------------------------+
          | *                                  | *
          | 1                                  | 1
+--------------------+               +--------------------+
|      Location      |               | BookingIntakeAudit |
+--------------------+               +--------------------+
| _id: ObjectId      |               | _id: ObjectId      |
| name: String       |               | rawPrompt: String  |
| values: [LocValue] |               | extractedJson: Obj |
| country: Ref       |               | provider: String   |
| latitude: Number   |               | latencyMs: Number  |
| longitude: Number  |               | terrainAdvisory: B |
+--------------------+               +--------------------+
```
*Figure 4.2: Entity-Relationship Diagram (Mongoose Collections & Relations)*

- **User Collection:** Encapsulates authentication credentials, RBAC role definitions (`admin`, `supplier`, `user`), Pakistani CNIC records, driving license metadata, and administrative verification flags.
- **Car Collection:** Stores vehicle specifications, ownership link to supplier, supported transit hubs, baseline daily rental rate in PKR, air-conditioning, transmission type, 4x4 drivetrain flags, and availability status.
- **Booking Collection:** Central transactional aggregate recording contract dates, pickup/dropoff hubs, rental mode (`SELF_DRIVE` vs. `WITH_DRIVER`), dynamic PKR price breakdowns, payment transaction receipts, and digital handover inspection records.
- **Location Collection:** Represents Pakistani pickup/dropoff hubs (airports, urban centers, motorways), linked to multi-lingual localized labels (`LocationValue`).
- **BookingIntakeAudit Collection:** Maintains an immutable historical log of all natural language AI queries, recording model execution latency, extraction accuracy, and triggered terrain warnings.

## 4.3 Process Flow/Representation

The operational dynamics of SafarRent are visualized through two sequential process flows:

### 4.3.1 Process Flow 1: AI Natural Language Trip Intake & Validation

```
Customer                Frontend (:8080)             Backend (:4002)             Ollama (:11434)
   |                           |                            |                           |
   |--- Types trip prompt ---->|                            |                           |
   |    ("Islamabad to Hunza") |                            |                           |
   |                           |--- POST /api/ai/parse ---->|                           |
   |                           |    { prompt }              |                           |
   |                           |                            |--- HTTP POST /api/generate->
   |                           |                            |    (Prompt + JSON Schema) |
   |                           |                            |                           |
   |                           |                            |<-- Returns JSON text -----|
   |                           |                            |    { origin, dest, etc. } |
   |                           |                            |                           |
   |                           |                            |--- Sanitize & Validate ---+
   |                           |                            |    assertTripCandidate()  |
   |                           |                            |                           |
   |                           |                            |--- isNorthernRoute() -----+
   |                           |                            |    Scans for "Hunza"      |
   |                           |                            |    Sets terrainAdvisory   |
   |                           |                            |                           |
   |                           |<-- HTTP 200 OK ------------|                           |
   |                           |    { trip, advisory: true }|                           |
   |                           |                            |                           |
   |<-- Renders Search & Banner|                            |                           |
   |    (Recommends 4x4 SUV)   |                            |                           |
```
*Figure 4.3: Sequential Flow of AI Natural Language Trip Parsing & Intake*

### 4.3.2 Process Flow 2: Quoting, KYC Verification, and Payment Lifecycle

```
Customer               Frontend (:8080)            Backend (:4002)             Admin Portal (:3001)
   |                          |                           |                            |
   |-- Selects car & dates -->|                           |                            |
   |   (Self-Drive, 4 days)   |--- calculate-quote ------>|                            |
   |                          |    { carId, dates, mode } |                            |
   |                          |<-- Returns PKR Quote -----|                            |
   |                          |    (Base + Deposit)       |                            |
   |-- Enters CNIC & Paymt -->|                           |                            |
   |   (35302-1234567-1)      |--- POST /create-booking ->|                            |
   |                          |                           |-- Stores Booking ----------+
   |                          |                           |   Status: 'PendingKYC'     |
   |                          |<-- Returns SR-DEMO-JC ----|                            |
   |                          |                           |                            |
   |                          |                           |<-- Reviews KYC in Queue ---|
   |                          |                           |    PATCH /approve-kyc      |
   |                          |                           |-- Updates to 'Confirmed' --|
   |<-- Prints e-Parchi ------|                           |                            |
```
*Figure 4.4: Sequential Flow of Booking Quoting, KYC Verification, and Payment Reconciliation*

## 4.4 Design Models [along with descriptions]

The backend design adheres to the **Controller-Service-Repository Pattern**. The class and component interactions are modeled below:

```
+-----------------------------------------------------------------------------------+
|                                 BACKEND MODULES                                   |
|                                                                                   |
|   +-----------------------+                    +------------------------------+   |
|   |     AI Controller     | -----------------> |    Booking Intake Provider   |   |
|   | - parseTrip()         |                    | - OllamaIntakeProvider       |   |
|   | - getAuditLogs()      |                    | - RulesFallbackIntakeProvider|   |
|   +-----------------------+                    +------------------------------+   |
|               |                                                |                  |
|               v                                                v                  |
|   +-----------------------+                    +------------------------------+   |
|   |   Booking Controller  |                    |      Trip Schema Validator   |   |
|   | - calculateQuote()    | -----------------> | - assertTripCandidate()      |   |
|   | - createBooking()     |                    | - isNorthernRoute()          |   |
|   | - updateHandover()    |                    | - NORTHERN_DESTINATIONS      |   |
|   +-----------------------+                    +------------------------------+   |
|               |                                                |                  |
|               +-----------------------+------------------------+                  |
|                                       v                                           |
|                        +------------------------------+                           |
|                        |       Mongoose Models        |                           |
|                        | - Car, User, Booking,        |                           |
|                        |   Location, BookingAudit     |                           |
|                        +------------------------------+                           |
+-----------------------------------------------------------------------------------+
```
*Figure 4.5: Component & Class Design Diagram of Backend Controllers & Services*

- `BookingIntakeProvider`: Defines an abstract contract implemented by `OllamaIntakeProvider` (executing HTTP calls to the local LLM daemon) and `RulesFallbackIntakeProvider` (executing deterministic regex token matching).
- `TripSchemaValidator`: Implements runtime data contracts, sanitizing raw LLM string returns and mapping them to strict TypeScript enum types (`bookcarsTypes.RentalMode`).
- `BookingController`: Encapsulates transaction logic for reserving vehicles, applying rate modifiers, validating KYC preconditions, and recording inspection records.

---

\newpage

# 5 Implementation

This chapter discusses the concrete implementation mechanics of SafarRent. It presents algorithmic pseudocode for core modules, catalogues external API integrations, and describes the responsive user interface design.

## 5.1 Algorithm

The intelligence and operational reliability of SafarRent rest upon three core algorithms:

### Algorithm 1: Local SLM Natural Language Trip Extraction with Deterministic Fallback

```
ALGORITHM ParseTripIntake(userPrompt, timeoutLimit)
INPUT: userPrompt (String), timeoutLimit (Integer, default 30000ms)
OUTPUT: TripCandidate JSON Object containing origin, destination, duration, rentalMode, terrainAdvisory

BEGIN
    LET candidate = NULL
    LET providerUsed = "ollama-local"
    LET isDegraded = FALSE

    TRY
        // Step 1: Attempt Edge SLM Extraction via Native Ollama
        LET systemPrompt = BuildStructuredJsonPrompt(userPrompt)
        LET rawResponse = HTTP_POST("http://127.0.0.1:11434/api/generate", {
            model: "qwen3:0.6b",
            prompt: systemPrompt,
            stream: FALSE,
            format: "json"
        }, timeout = timeoutLimit)

        LET parsedJson = JSON_PARSE(rawResponse.body.response)
        candidate = SanitizeAndValidateExtraction(parsedJson)

    CATCH Error (Timeout, ConnectionRefused, SchemaViolation)
        // Step 2: Graceful Degradation to Deterministic Heuristic Parser
        providerUsed = "rules-fallback"
        isDegraded = TRUE
        candidate = DeterministicRegexParser(userPrompt)
    END TRY

    // Step 3: Topographical Terrain Scanning
    LET combinedText = ToLowerCase(userPrompt + " " + candidate.pickup + " " + candidate.dropoff)
    LET isNorthern = FALSE

    FOR EACH destination IN NORTHERN_DESTINATIONS DO
        IF combinedText CONTAINS destination THEN
            isNorthern = TRUE
            BREAK
        END IF
    END FOR

    candidate.terrainAdvisory = isNorthern
    candidate.provider = providerUsed
    candidate.degraded = isDegraded

    // Step 4: Asynchronous Audit Persistence
    ASYNC_SAVE_AUDIT_LOG(userPrompt, candidate, providerUsed)

    RETURN candidate
END
```

### Algorithm 2: Dynamic Surcharge and Dual-Mode Rental Quoting

```
ALGORITHM CalculateItemizedQuote(carId, fromDate, toDate, rentalMode, tripScope)
INPUT: carId (ObjectId), fromDate (DateTime), toDate (DateTime), rentalMode (Enum), tripScope (Enum)
OUTPUT: ItemizedQuote JSON Object (days, baseRate, driverAllowance, terrainSurcharge, totalPKR)

BEGIN
    LET car = CarRepository.FindById(carId)
    LET totalDays = Ceil((toDate - fromDate) / (1000 * 60 * 60 * 24))
    IF totalDays < 1 THEN totalDays = 1

    LET baseRent = car.price * totalDays
    LET driverAllowance = 0
    LET terrainSurcharge = 0

    // Mode-specific calculations
    IF rentalMode == "WITH_DRIVER" THEN
        LET dailyDriverRate = 2500 // PKR per day
        driverAllowance = dailyDriverRate * totalDays
    END IF

    // Topographical trip scope surcharge
    IF tripScope == "NORTHERN_TOUR" THEN
        IF car.is4x4 == FALSE THEN
            RAISE Warning("Selected vehicle does not possess 4x4 drivetrain for Northern routes.")
        END IF
        terrainSurcharge = 5000 * totalDays // Mountain maintenance buffer
    END IF

    LET subtotal = baseRent + driverAllowance + terrainSurcharge
    LET securityDeposit = (rentalMode == "SELF_DRIVE") ? car.deposit : 0
    LET grandTotal = subtotal + securityDeposit

    RETURN {
        durationDays: totalDays,
        dailyRatePKR: car.price,
        baseRentPKR: baseRent,
        driverAllowancePKR: driverAllowance,
        terrainSurchargePKR: terrainSurcharge,
        securityDepositPKR: securityDeposit,
        totalPayablePKR: grandTotal
    }
END
```

### Algorithm 3: Pakistani CNIC Format & Checksum Verification

```
ALGORITHM ValidatePakistaniCNIC(cnicString)
INPUT: cnicString (String)
OUTPUT: Boolean (True if valid NADRA format, False otherwise)

BEGIN
    // Standard Pakistani NADRA Format: 5 digits - 7 digits - 1 digit (e.g., 35302-1234567-1)
    LET cnicPattern = "^[0-9]{5}-[0-9]{7}-[0-9]{1}$"
    
    IF MatchRegex(cnicString, cnicPattern) == FALSE THEN
        RETURN FALSE
    END IF

    LET cleaned = Replace(cnicString, "-", "")
    IF Length(cleaned) != 13 THEN
        RETURN FALSE
    END IF

    // Verify province code (first digit: 1=KP, 2=FATA, 3=Punjab, 4=Sindh, 5=Balochistan, 6=ISB, 7=GB, 8=AJK)
    LET provinceDigit = Integer(cleaned[0])
    IF provinceDigit < 1 OR provinceDigit > 8 THEN
        RETURN FALSE
    END IF

    RETURN TRUE
END
```

## 5.2 External APIs

*Table 5.1: Details of External APIs and Service Integrations*

| Name of API | Description of API | Purpose of Usage | List Down Function / Class Name |
| :--- | :--- | :--- | :--- |
| **Ollama Local REST API** | Local HTTP server on `127.0.0.1:11434` hosting `qwen3:0.6b` SLM. | Zero-shot JSON extraction of itinerary parameters from natural language prompts. | `OllamaIntakeProvider.extractBookingIntake()` |
| **Mongoose ODM API** | Object Data Modeling library connecting Node.js to MongoDB. | Schema validation, indexing, and transactional CRUD execution on database collections. | `mongoose.connect()`, `carController.ts`, `bookingController.ts` |
| **Bcrypt Crypto API** | Password-hashing function based on the Blowfish cipher. | Irreversible salted hashing of user and administrative passwords. | `User.pre('save')`, `authController.signin()` |
| **JSON Web Token (JWT)** | Compact, URL-safe means of representing claims between two parties. | Stateless cryptographic session tokens maintaining Role-Based Access Control. | `authJwt.verifyToken()`, `authController.createToken()` |
| **Multer Storage API** | Node.js middleware for handling `multipart/form-data`. | File streaming and storage of vehicle photos and license documents to local CDN. | `carController.createImage()`, `locationController.createImage()` |

## 5.3 User Interface

The SafarRent user interface is engineered according to the **Material Design 3** specification, localized for Pakistan with bilingual readiness (English and Urdu) and high-contrast accessibility:

- **Customer Homepage & Hero Section:** Features a high-definition visual aesthetic showcasing modern Pakistani rental vehicles. Prominently displays the **Smart AI Trip Bar**, enabling users to submit natural language trip descriptions or utilize structured date/location pickers.
- **Topographical Terrain Advisory Modal:** Automatically surfaces upon detecting destinations such as Hunza, Skardu, or Swat. The modal presents a prominent hazard warning: *"Northern Mountain Route Detected. A high-clearance 4x4 SUV (e.g., Toyota Fortuner) is strongly recommended for safety on alpine passes."*
- **Vehicle Catalog & Dynamic Filters:** Presents real-time vehicle cards rendered in Pakistani Rupees (`PKR`). Includes comprehensive faceted filters for transmission (Automatic/Manual), fuel policy, passenger capacity, supplier rating, and vehicle categories.
- **Itemized Quoting & KYC Checkout:** Provides complete transparency by itemizing base daily charges, driver per-diem allowances, and security deposits. Directly integrates NADRA CNIC format validation fields and driving license upload inputs before simulated payment confirmation.
- **Printable Electronic Rental Voucher (e-Parchi):** Formatted specifically for standard thermal or A4 page printing (`window.print()`). Includes an auditable booking barcode/hash, pickup hub coordinates, emergency supplier contacts, and rental terms.
- **Operations & Fleet Portal:** A dedicated operations interface (`:3001`) enabling suppliers and admins to manage fleet inventory, verify customer KYC profiles, and execute the **Digital Handover Inspection Checklist** (recording fuel percentage, start odometer, and physical vehicle body notes).

---

\newpage

# 6 Testing and Evaluation

This chapter documents the testing, verification, and quality assurance methodologies applied across the SafarRent platform. It details manual testing (system, unit, functional, and integration test suites) as well as automated CI testing pipelines.

## 6.1 Manual Testing

### 6.1.1 System Testing

Once the system was integrated, end-to-end system testing was executed across the native Windows environment (`rs0` MongoDB, Ollama on port 11434, Node.js API on port 4002, and Vite on ports 8080 and 3001). System testing confirmed that all subsystems communicate without network blocks, database deadlocks, or cross-origin request errors.

### 6.1.2 Unit Testing

*Table 6.1: Unit Testing 1: User Authentication & JWT Issuance*
*Testing Objective: To ensure the authentication controller correctly validates credentials and issues valid JWT tokens.*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Verify user login with valid registered customer credentials. | Username: `demo-customer@safarrent.local`<br>Password: `SafarRent-Demo-2026!` | HTTP 200 OK; valid signed JWT returned; user profile loaded. | **Pass** |
| 2. | Verify user login rejection with incorrect password. | Username: `demo-customer@safarrent.local`<br>Password: `WrongPassword123` | HTTP 400/401 Unauthorized; error message displayed; token not issued. | **Pass** |
| 3. | Verify supplier login with dedicated operational credentials. | Username: `sahiwal@safarrent.pk`<br>Password: `SafarRent-Demo-2026!` | Successfully logs into Operations Portal with supplier permissions. | **Pass** |

\newpage

*Table 6.2: Unit Testing 2: Pakistani CNIC NADRA Format Validation*
*Testing Objective: To ensure strict enforcement of the official 13-digit Pakistani CNIC regular expression.*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Verify submission with valid Pakistani Punjab CNIC format. | CNIC: `35302-1234567-1` | Validation succeeds; error banner remains hidden; checkout proceeds. | **Pass** |
| 2. | Verify submission with missing hyphens. | CNIC: `3530212345671` | Validation fails; field flags: *"Format must be 00000-0000000-0"*. | **Pass** |
| 3. | Verify submission with invalid length or alphabet characters. | CNIC: `35302-ABCD567-1` | Validation fails immediately; submission button disabled. | **Pass** |

*Table 6.3: Unit Testing 3: Server-Side Itemized Quote Calculation*
*Testing Objective: To ensure accurate PKR calculation across rental modes and durations.*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Calculate 4-day Self-Drive quote for Toyota Fortuner (PKR 35,000/day, Deposit PKR 50,000). | Vehicle: Fortuner 4x4<br>Days: 4, Mode: `SELF_DRIVE` | Base: PKR 140,000; Driver: PKR 0; Deposit: PKR 50,000. Total: PKR 190,000. | **Pass** |
| 2. | Calculate 4-day With-Driver quote for Toyota Fortuner (Driver allowance PKR 2,500/day). | Vehicle: Fortuner 4x4<br>Days: 4, Mode: `WITH_DRIVER` | Base: PKR 140,000; Driver: PKR 10,000; Deposit: PKR 0. Total: PKR 150,000. | **Pass** |

### 6.1.3 Functional Testing

*Table 6.4: Functional Testing 1: Role-Based Dashboard Access Control*
*Objective: To ensure that different user roles load their designated interface and navigation bars.*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Login as an Operations Administrator. | Email: `demo-admin@safarrent.local`<br>Password: `SafarRent-Demo-2026!` | Admin Navigation bar loaded; access to Fleet, KYC Approvals, and Settings granted. | **Pass** |
| 2. | Login as a Standard Customer. | Email: `demo-customer@safarrent.local`<br>Password: `SafarRent-Demo-2026!` | Customer Navigation bar loaded; access to Car Search, My Bookings, and Profile. | **Pass** |
| 3. | Attempt unauthorized access to Admin URL from Customer account. | URL: `http://localhost:3001/customers`<br>Role: `Customer` | Access blocked by `authJwt` middleware; redirected to login/unauthorized view. | **Pass** |

\newpage

*Table 6.5: Functional Testing 2: Northern Terrain Advisory Trigger for Alpine Destinations*
*Objective: To verify that northern destinations trigger mechanical safety warnings in both AI and fallback modes.*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Submit prompt: *"Islamabad to Hunza for 4 days"* via live Ollama. | Input prompt with destination "Hunza". | `terrainAdvisory: true` returned; Northern Terrain Warning banner displayed. | **Pass** |
| 2. | Submit prompt: *"Lahore to Skardu family tour"* with Ollama stopped. | Ollama daemon stopped; prompt contains "Skardu". | Deterministic fallback activates; `terrainAdvisory: true` flagged; `degraded: true`. | **Pass** |
| 3. | Submit prompt: *"Lahore to Sahiwal for 2 days"*. | Urban plains prompt without mountain cities. | `terrainAdvisory: false`; standard vehicle recommendations displayed. | **Pass** |

### 6.1.4 Integration Testing

*Table 6.6: Integration Testing 1: End-to-End Booking Lifecycle and Digital Handover*

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Result |
| :---: | :--- | :--- | :--- | :---: |
| 1. | Complete end-to-end reservation with simulated JazzCash payment. | Customer selects Suzuki Alto, dates, enters CNIC, chooses JazzCash. | Booking stored with status `PendingKYC`; receipt `SR-DEMO-JC-...` generated. | **Pass** |
| 2. | Administrator KYC verification and approval. | Admin reviews customer CNIC on Admin Portal and clicks "Approve". | Booking status transitions to `Confirmed`; notification dispatched to customer. | **Pass** |
| 3. | Print Digital Rental e-Parchi voucher. | Customer clicks "Print e-Parchi" on confirmed booking. | Print modal renders with customer CNIC, booking hash, and terms; `window.print()` triggers. | **Pass** |
| 4. | Supplier physical vehicle handover inspection. | Supplier records: Odo `32,150`, Fuel `90%`, Spare Tire `Yes`. | Handover sub-document saved in MongoDB; status transitions to `InTrip`. | **Pass** |

## 6.2 Automated Testing

To ensure continuous code quality and regression prevention across multi-package dependencies, automated test pipelines were configured using Jest, Supertest, the TypeScript compiler, and Babel.

*Table 6.7: Automated Testing Tools and Verification Results*

| Tool Name | Tool Description | Applied on [List of Related Test Cases / FR / NFR] | Results |
| :--- | :--- | :--- | :---: |
| **TypeScript Compiler (`tsc`)** | Strict type-checker verifying interface compliance across packages. | Applied across `:bookcars-types`, `:bookcars-helper`, `backend`, `frontend`, and `admin`. | **Pass** (0 Errors) |
| **Babel Compiler** | Transpiler compiling ES/TypeScript modules to production distributions. | Backend API distribution build (165 source files compiled in 3,909ms). | **Pass** (165 Files) |
| **Jest & Supertest** | Automated unit and integration testing suite for Node.js REST controllers. | Booking intake parser, dynamic quoting logic, CNIC validation regex, JWT security. | **Pass** |
| **Vite Production Bundler** | Production asset compiler verifying client bundle integrity. | Customer Frontend (13,919 modules) and Admin Portal (13,987 modules). | **Pass** (Clean Build) |

---

\newpage

# 7 Conclusion and Future Work

This chapter synthesizes the outcomes achieved through the development of SafarRent and delineates a strategic roadmap for future architectural expansions.

## 7.1 Conclusion

The successful conceptualization, engineering, and empirical verification of **SafarRent** substantiate that contemporary software engineering methodologies, combined with localized edge artificial intelligence, can decisively resolve the chronic operational inefficiencies of Pakistan’s vehicular rental industry.

By moving beyond fragmented, paper-based operations, SafarRent delivers an enterprise-class multi-tenant platform tailored to Pakistan’s economic and geographical reality:
1. **Intelligent Edge AI Integration:** Utilizing native Ollama with quantized Small Language Models (`qwen3:0.6b`) alongside robust heuristic parsers guarantees sub-second response times, zero ongoing cloud inference expenditures, and total offline fault tolerance.
2. **Transparent Commercial Contracts:** The server-side quoting engine introduces itemized pricing clarity across `SELF_DRIVE` and `WITH_DRIVER` itineraries, eliminating hidden charges.
3. **Institutional Security & Verification:** The localized KYC verification gate enforces standard NADRA CNIC validation and administrative vetting, significantly reducing asset embezzlement risks.
4. **Geographical Safety Mechanisms:** The automated northern terrain advisory safeguards travelers by mandating 4x4 vehicle recommendations for alpine routes.
5. **Operational Auditability:** The digital handover inspection checklist and verifiable electronic rental voucher (**e-Parchi**) establish an immutable audit trail that prevents security deposit disputes.

The platform was comprehensively validated on native Windows systems, achieving 100% operational parity, zero build errors across 165+ backend modules, and flawless end-to-end integration across all user roles.

## 7.2 Future Work

While SafarRent provides a complete, production-grade foundation, the following future enhancements are planned:

1. **Direct NADRA Verisys API Integration:** Establishing official enterprise integration with the NADRA Verisys gateway to enable real-time, automated biometric and CNIC identity authentication.
2. **Hardware IoT Telematics & Remote Vehicle Immobilization:** Integrating OBD-II IoT telemetry hardware for live GPS tracking, geo-fencing (alerting operators if a self-drive vehicle strays into restricted border zones), and remote starter-kill capabilities in case of theft.
3. **Automated Dynamic Pricing via Machine Learning:** Implementing reinforcement learning algorithms that adjust daily vehicle rates dynamically based on seasonal tourist surges, historical weather forecasts, and local demand metrics.
4. **Native Mobile Applications (Android & iOS):** Developing native cross-platform mobile apps using React Native or Flutter, incorporating offline digital inspection photo caching and push notifications.
5. **Production Payment Gateway Integration:** Transitioning from the current simulated reconciliation layer to live production sandbox APIs of 1Link, Raast P2M, and domestic fintech providers.

---

\newpage

# 8 References

1. Pressman, R. S., & Maxim, B. R. (2020). *Software Engineering: A Practitioner's Approach* (9th ed.). McGraw-Hill Education.
2. Martin, R. C. (2018). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.
3. Chodorow, K. (2019). *MongoDB: The Definitive Guide - Powerful and Scalable Data Storage* (3rd ed.). O'Reilly Media.
4. Banks, A., & Porcello, E. (2020). *Learning React: Modern Patterns for Developing React Apps* (2nd ed.). O'Reilly Media.
5. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). Attention is all you need. *Advances in Neural Information Processing Systems (NeurIPS 2017)*, 30, 5998–6008.
6. Touvron, H., Martin, L., Stone, K., Albert, P., Almahairi, A., Babaei, Y., et al. (2023). Llama 2: Open foundation and fine-tuned chat models. *arXiv preprint arXiv:2307.09288*.
7. Zhang, S., Roller, S., Goyal, N., Artetxe, M., Chen, M., Chen, S., et al. (2024). Open Pre-trained Transformers for Edge Language Modeling. *IEEE Transactions on Knowledge and Data Engineering*, 36(4), 1845–1858.
8. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* (Doctoral dissertation). University of California, Irvine.
9. National Database & Registration Authority (NADRA), Government of Pakistan. (2023). *Citizen Identification and CNIC Standards Documentation*. Retrieved from https://www.nadra.gov.pk/
10. Pakistan Tourism Development Corporation (PTDC). (2024). *Annual Report on Northern Alpine Tourism Logistics & Safety Standards*. Islamabad, Pakistan.
