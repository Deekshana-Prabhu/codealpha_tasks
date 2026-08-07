/**
 * Pre-loaded Comprehensive FAQ Datasets for Multiple Topics
 */

const DEFAULT_FAQ_DATASETS = {
  ecommerce: {
    name: "E-Commerce & Online Shopping",
    icon: "fa-shopping-bag",
    faqs: [
      {
        id: "ec-1",
        category: "Shipping & Delivery",
        question: "How long does shipping take and how much does it cost?",
        answer: "Standard shipping takes 3-5 business days ($4.99 or FREE on orders over $50). Expedited 2-day shipping is $12.99, and overnight express is $24.99.",
        keywords: "shipping, delivery, time, cost, fee, price, standard, expedited, express, free shipping"
      },
      {
        id: "ec-2",
        category: "Shipping & Delivery",
        question: "Do you ship internationally and how are customs duties handled?",
        answer: "Yes, we ship to over 80 countries worldwide! International shipping takes 7-14 business days. Customs duties and taxes are calculated at checkout so there are no surprise fees on delivery.",
        keywords: "international, worldwide, global, customs, duty, tax, overseas, country, import"
      },
      {
        id: "ec-3",
        category: "Returns & Refunds",
        question: "What is your return and refund policy?",
        answer: "We offer a 30-day hassle-free money-back guarantee! You can return any unworn, unwashed item in its original packaging within 30 days of delivery for a full refund or exchange.",
        keywords: "return, refund, policy, money back, exchange, 30 days, guarantee, return item, refund money"
      },
      {
        id: "ec-4",
        category: "Returns & Refunds",
        question: "How do I process a return or exchange for a damaged item?",
        answer: "To return or exchange an item, go to Account > Orders, click 'Initiate Return', print the prepaid shipping label, and attach it to your parcel. Refunds are issued to your original payment method within 3 business days of receipt.",
        keywords: "damaged, broken, wrong size, exchange, prepaid label, return process, refund status"
      },
      {
        id: "ec-5",
        category: "Order Tracking",
        question: "How can I track my order status?",
        answer: "Once your order ships, we send a confirmation email with your tracking number. You can also track your shipment in real-time by entering your Order ID on our Track Order page.",
        keywords: "track, order, status, package, tracking number, shipment, location, where is my order, transit"
      },
      {
        id: "ec-6",
        category: "Order Management",
        question: "Can I modify or cancel my order after it has been placed?",
        answer: "Orders can be modified or cancelled within 1 hour of placing them. Go to Account > Order History and click 'Cancel Order' or 'Edit Shipping Address'. After 1 hour, processing begins and items must be returned after arrival.",
        keywords: "cancel, modify, change, edit, update address, order history, cancel order, mistake"
      },
      {
        id: "ec-7",
        category: "Payment Methods",
        question: "What payment methods do you accept?",
        answer: "We accept Visa, Mastercard, American Express, Discover, PayPal, Apple Pay, Google Pay, and Shop Pay. We also offer interest-free installment options via Klarna and Affirm.",
        keywords: "payment, accept, credit card, debit card, paypal, apple pay, google pay, klarna, affirm, pay"
      },
      {
        id: "ec-8",
        category: "Account & Security",
        question: "How do I reset my account password?",
        answer: "To reset your password, click 'Sign In' at the top right, select 'Forgot Password?', enter your registered email address, and click Submit. Check your inbox for the password reset link.",
        keywords: "reset, password, forgot, account, sign in, log in, email, change password, locked out"
      },
      {
        id: "ec-9",
        category: "Discounts & Coupons",
        question: "How do I apply a promo code or discount voucher?",
        answer: "Enter your promo code in the 'Discount Code' field during checkout and click 'Apply'. Discounts will immediately reflect in your order total before payment.",
        keywords: "discount, promo code, coupon, voucher, savings, deal, checkout, promo, offer"
      },
      {
        id: "ec-10",
        category: "Customer Support",
        question: "How can I contact customer service?",
        answer: "Our support team is available 24/7! Reach us via Live Chat on our website, email at support@store.example.com, or phone at 1-800-555-0199.",
        keywords: "contact, support, customer service, email, phone, live chat, call, help desk, agent, representative"
      },
      {
        id: "ec-11",
        category: "Inventory & Restock",
        question: "When will out-of-stock items be restocked?",
        answer: "Out-of-stock items are typically restocked within 1-2 weeks. You can click 'Notify Me When Available' on any product page to receive an automated email as soon as stock arrives.",
        keywords: "out of stock, restock, sold out, inventory, available, back in stock, notification"
      },
      {
        id: "ec-12",
        category: "Warranty & Guarantee",
        question: "Do your products come with a warranty?",
        answer: "Yes! All products include a standard 1-year manufacturer warranty covering defect material and workmanship. Extended 2-year and 3-year warranty plans are available at checkout.",
        keywords: "warranty, guarantee, defective, broken, repair, coverage, manufacturer"
      }
    ]
  },
  saas: {
    name: "SaaS & Cloud Software",
    icon: "fa-cloud",
    faqs: [
      {
        id: "saas-1",
        category: "Pricing & Plans",
        question: "What pricing plans do you offer and is there a free trial?",
        answer: "We offer a 14-day free trial with full access to all features (no credit card required!). Paid plans start at $19/month for Starter, $49/month for Pro, and custom Enterprise pricing for large teams.",
        keywords: "pricing, plans, free trial, cost, subscription, monthly, annual, tier, tier cost, price"
      },
      {
        id: "saas-2",
        category: "Security & Privacy",
        question: "Is my data secure and compliant with privacy standards?",
        answer: "Yes! We enforce AES 256-bit encryption in transit and at rest. We are SOC 2 Type II certified, GDPR compliant, HIPAA compliant, and perform weekly third-party penetration audits.",
        keywords: "security, data, privacy, gdpr, soc 2, hipaa, encryption, compliant, safe, breach, vault"
      },
      {
        id: "saas-3",
        category: "API & Integrations",
        question: "Do you provide REST API access and third-party integrations?",
        answer: "Yes! We offer a full REST API and Webhooks with comprehensive developer documentation. Native integrations include Slack, Zapier, Salesforce, HubSpot, GitHub, Jira, and Google Workspace.",
        keywords: "api, integration, zapier, slack, salesforce, webhook, rest api, developer, connect, github, jira"
      },
      {
        id: "saas-4",
        category: "Subscription Management",
        question: "How do I upgrade, downgrade, or cancel my subscription?",
        answer: "Manage your subscription anytime under Settings > Billing. You can upgrade, downgrade, or cancel with one click. Upgrades take effect immediately; cancellations remain active until the end of your billing cycle.",
        keywords: "cancel, subscription, upgrade, downgrade, billing, cancel account, refund, end subscription, plan change"
      },
      {
        id: "saas-5",
        category: "System Requirements",
        question: "What are the system requirements to run the software?",
        answer: "Our software is 100% web-based and runs in any modern browser (Chrome, Firefox, Safari, Edge). Desktop apps for Windows/macOS and mobile apps for iOS/Android are also available.",
        keywords: "system requirements, browser, chrome, app, desktop, mobile, install, download, cloud, mac, windows"
      },
      {
        id: "saas-6",
        category: "Team & Permissions",
        question: "How do I add team members and assign role permissions?",
        answer: "Admins can invite team members under Settings > User Management by entering their email addresses. Roles include Admin, Editor, and Viewer with customizable granular permission toggles.",
        keywords: "team, invite, member, seats, role, admin, permission, user management, access, roles"
      },
      {
        id: "saas-7",
        category: "Data Export & Backup",
        question: "Can I export my data and how are automated backups performed?",
        answer: "You can export all workspace data at any time in JSON, CSV, or PDF format. We conduct automated real-time database replication and hourly offsite snapshots stored redundantly across multiple AWS regions.",
        keywords: "export, data, backup, download, csv, json, pdf, snapshot, aws, restore"
      },
      {
        id: "saas-8",
        category: "Billing & Invoices",
        question: "Where can I view my billing invoices and update my payment details?",
        answer: "Invoices and tax receipts are available under Settings > Billing > Invoices. You can also update credit card details or enter VAT/tax identification numbers for business expense accounting.",
        keywords: "invoice, receipt, billing, tax, vat, credit card, update card, receipt download"
      },
      {
        id: "saas-9",
        category: "Technical Support",
        question: "What technical support channels and SLAs do you provide?",
        answer: "Starter and Pro plans include 24/5 email and chat support with <2 hour response times. Enterprise plans include a dedicated account manager, 24/7 phone escalation, and a guaranteed 99.9% uptime SLA.",
        keywords: "support, technical, sla, uptime, phone, chat, help, response time, dedicated manager"
      }
    ]
  },
  university: {
    name: "University Admissions & Campus",
    icon: "fa-graduation-cap",
    faqs: [
      {
        id: "uni-1",
        category: "Admissions",
        question: "What are the application deadlines and admission requirements?",
        answer: "Early Decision application deadline is November 1st, and Regular Decision is January 15th. Required documents: official high school transcripts, 2 teacher recommendation letters, and a personal statement essay. SAT/ACT scores are test-optional.",
        keywords: "admission, application, deadline, transcript, sat, act, requirement, apply, fall, spring, essay"
      },
      {
        id: "uni-2",
        category: "Tuition & Financial Aid",
        question: "How do I apply for scholarships and financial aid?",
        answer: "File your FAFSA form by March 1st. Over 85% of undergraduate students receive financial assistance! Merit-based scholarships are automatically evaluated upon submitting your primary admission application.",
        keywords: "tuition, financial aid, fafsa, scholarship, grant, loan, cost, fee, assistance, aid"
      },
      {
        id: "uni-3",
        category: "Housing & Dining",
        question: "Are first-year students required to live in campus housing?",
        answer: "Yes, all first-year undergraduate students are required to live in university residence halls unless granted a local commuter exemption. Roommate matching and housing selection open in April.",
        keywords: "housing, dorm, residence hall, campus, living, room and board, roommate, dining, meal plan"
      },
      {
        id: "uni-4",
        category: "Academics & Majors",
        question: "Can I double major or declare a minor in another subject?",
        answer: "Yes! Students can declare a double major or add one or more minors after completing their first semester. Speak with your Academic Advisor to structure your degree plan.",
        keywords: "major, minor, degree, double major, courses, subjects, academic advisor, classes"
      },
      {
        id: "uni-5",
        category: "International Students",
        question: "What are the requirements for international student applicants?",
        answer: "International applicants must submit official transcripts translated into English, proof of English proficiency (TOEFL iBT min 80, IELTS min 6.5, or Duolingo min 115), and financial certification for I-20 visa processing.",
        keywords: "international, visa, i-20, toefl, ielts, duolingo, english test, foreign student, passport"
      },
      {
        id: "uni-6",
        category: "Transfer Applicants",
        question: "How do transfer credit evaluations and transfer applications work?",
        answer: "Transfer applications are reviewed on a rolling basis for Fall and Spring terms. Courses completed at accredited institutions with a grade of 'C' or higher are eligible for credit transfer.",
        keywords: "transfer, credits, previous college, university, credit evaluation, transfer student"
      },
      {
        id: "uni-7",
        category: "Campus Life & Tours",
        question: "How can I schedule a campus tour or attend an open house?",
        answer: "Guided campus tours take place Monday through Saturday. You can book a tour or register for virtual info sessions on our Visit Campus web portal.",
        keywords: "tour, visit, campus visit, open house, virtual tour, admissions event, info session"
      },
      {
        id: "uni-8",
        category: "Career & Internships",
        question: "What career services and internship placement assistance are provided?",
        answer: "Our Career Center provides 1-on-1 resume reviews, mock interview coaching, bi-annual campus career fairs with top employers, and a 94% job placement rate within 6 months of graduation.",
        keywords: "career, job, internship, placement, employment, resume, interview, hiring, alumni"
      }
    ]
  }
};

window.DEFAULT_FAQ_DATASETS = DEFAULT_FAQ_DATASETS;
