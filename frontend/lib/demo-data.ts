import { Invoice } from "./types";

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "inv-live-nishant",
    invoiceNumber: "INV-2026-NISHANT-LIVE",
    debtorId: "deb-nishant-live",
    debtor: {
      id: "deb-nishant-live",
      companyName: "Nishant Tech Ventures",
      contactPerson: "Nishant Maurya",
      phone: "+91 8840301998",
      email: "nishantma05@gmail.com",
      riskTier: "LOW",
      createdAt: "2026-10-01T10:00:00Z"
    },
    debtorName: "Nishant Maurya",
    debtorPhone: "+91 8840301998",
    debtorEmail: "nishantma05@gmail.com",
    debtorCompany: "Nishant Tech Ventures",
    amountDue: 5000,
    amount: 5000,
    currency: "INR",
    dueDate: "2026-10-25",
    daysPastDue: 5,
    daysOverdue: 5,
    deliverableSummary: "Full-Stack AI Invoice Recovery Agent & Indic Voice Pipeline",
    description: "Full-Stack AI Invoice Recovery Agent & Indic Voice Pipeline",
    status: "OVERDUE",
    graphRiskScore: 14,
    syndicateRiskScore: 14,
    paymentLinkUrl: "/pay/INV-2026-NISHANT-LIVE",
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-30T00:00:00Z"
  },
  {
    id: "inv-1045",
    invoiceNumber: "INV-1045",
    debtorId: "deb-4",
    debtor: {
      id: "deb-4",
      companyName: "HyperScale Global Labs",
      contactPerson: "Davin Dong",
      phone: "+1 415 555 2671",
      email: "davin@hyperscalelabs.io",
      riskTier: "LOW",
      createdAt: "2026-09-01T10:00:00Z"
    },
    amountDue: 50000,
    amount: 50000,
    currency: "INR",
    dueDate: "2026-10-10",
    daysPastDue: 19,
    daysOverdue: 19,
    deliverableSummary: "Full-Stack AI Voice Agents & Next.js Cockpit Architecture",
    description: "Full-Stack AI Voice Agents & Next.js Cockpit Architecture",
    status: "RECOVERED",
    recoveredAmount: 50000,
    revclaimFeeDeducted: 475,
    netPayoutToUser: 49525,
    payoutStatus: "REMITTED",
    graphRiskScore: 12,
    syndicateRiskScore: 12,
    paymentLinkUrl: "/pay/INV-1045",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-10-29T20:30:00Z"
  },
  {
    id: "inv-1042",
    invoiceNumber: "INV-1042",
    debtorId: "deb-1",
    debtor: {
      id: "deb-1",
      companyName: "Acme Creative Studios",
      contactPerson: "Rahul Sharma",
      phone: "+91 98765 43210",
      email: "rahul@acmestudios.in",
      riskTier: "MEDIUM",
      createdAt: "2026-09-10T10:00:00Z"
    },
    amountDue: 45000,
    amount: 45000,
    currency: "INR",
    dueDate: "2026-10-15",
    daysPastDue: 14,
    daysOverdue: 14,
    deliverableSummary: "Figma UI/UX Design System & Mobile App Wireframes",
    description: "Figma UI/UX Design System & Mobile App Wireframes",
    status: "OVERDUE",
    graphRiskScore: 48,
    syndicateRiskScore: 48,
    paymentLinkUrl: "/pay/INV-1042",
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-10-29T06:00:00Z"
  },
  {
    id: "inv-1043",
    invoiceNumber: "INV-1043",
    debtorId: "deb-2",
    debtor: {
      id: "deb-2",
      companyName: "Apex Retail Solutions",
      contactPerson: "Vikram Patel",
      phone: "+91 91234 56789",
      email: "vikram@apexretail.com",
      riskTier: "CRITICAL",
      createdAt: "2026-08-01T10:00:00Z"
    },
    amountDue: 28500,
    amount: 28500,
    currency: "INR",
    dueDate: "2026-10-05",
    daysPastDue: 24,
    daysOverdue: 24,
    deliverableSummary: "Custom Shopify Liquid Theme Development & Speed Optimization",
    description: "Custom Shopify Liquid Theme Development & Speed Optimization",
    status: "OVERDUE",
    graphRiskScore: 92,
    syndicateRiskScore: 92,
    paymentLinkUrl: "/pay/INV-1043",
    createdAt: "2026-09-05T10:00:00Z",
    updatedAt: "2026-10-29T06:00:00Z"
  },
  {
    id: "inv-1044",
    invoiceNumber: "INV-1044",
    debtorId: "deb-3",
    debtor: {
      id: "deb-3",
      companyName: "Nexus Digital Media",
      contactPerson: "Priya Mehta",
      phone: "+91 99887 76655",
      email: "priya@nexusmedia.agency",
      riskTier: "LOW",
      createdAt: "2026-09-20T10:00:00Z"
    },
    amountDue: 65000,
    amount: 65000,
    currency: "INR",
    dueDate: "2026-09-21",
    daysPastDue: 38,
    daysOverdue: 38,
    deliverableSummary: "Motion Graphics Brand Pack & 4x Video Reels Editing",
    description: "Motion Graphics Brand Pack & 4x Video Reels Editing",
    status: "OVERDUE",
    graphRiskScore: 68,
    syndicateRiskScore: 68,
    paymentLinkUrl: "/pay/INV-1044",
    createdAt: "2026-08-20T10:00:00Z",
    updatedAt: "2026-10-29T06:00:00Z"
  }
];

export const demoInvoices: Invoice[] = INITIAL_INVOICES;

export const initialCockpitStats: {
  totalOverdueAmount: number;
  recoveredAmount: number;
  recoveryRatePercent: number;
  activeChasingCount: number;
  settledInvoicesCount: number;
} = {
  totalOverdueAmount: 138500,
  recoveredAmount: 50000,
  recoveryRatePercent: 78,
  activeChasingCount: 3,
  settledInvoicesCount: 1,
};
