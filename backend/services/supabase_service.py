import os
import json
from typing import List, Dict, Any, Optional

try:
    from supabase import create_client, Client
except ImportError:
    Client = None

class SupabaseService:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        self.client: Optional[Any] = None
        
        if Client and self.url and self.key and not "your_" in self.url:
            try:
                self.client = create_client(self.url, self.key)
                print(f"[Supabase Python] Connected successfully to {self.url}")
            except Exception as e:
                print(f"[Supabase Python Warning] Init failed: {e}")

    def get_invoices(self) -> List[Dict[str, Any]]:
        if not self.client:
            return self._fallback_invoices()
        
        try:
            res = self.client.table("invoices").select("*, debtors(*)").order("days_past_due", desc=True).execute()
            if res.data:
                return res.data
            return self._fallback_invoices()
        except Exception as e:
            print(f"[Supabase Python] Query error, using fallback: {e}")
            return self._fallback_invoices()

    def update_invoice_status(self, invoice_id: str, status: str, ptp_amount: Optional[float] = None, ptp_date: Optional[str] = None):
        if not self.client:
            return True
        try:
            payload: Dict[str, Any] = {"status": status}
            if ptp_amount is not None:
                payload["ptp_amount"] = ptp_amount
            if ptp_date is not None:
                payload["ptp_date"] = ptp_date
            self.client.table("invoices").update(payload).eq("id", invoice_id).execute()
            return True
        except Exception as e:
            print(f"[Supabase Python] Update failed: {e}")
            return False

    def _fallback_invoices(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "inv-live-nishant",
                "invoice_number": "INV-2026-NISHANT-LIVE",
                "debtor_name": "Nishant Maurya",
                "debtor_company": "Nishant Tech Ventures",
                "debtor_phone": "+91 8840301998",
                "debtor_email": "nishantma05@gmail.com",
                "amount": 5000,
                "amount_due": 5000,
                "currency": "INR",
                "due_date": "2026-10-25",
                "days_past_due": 5,
                "days_overdue": 5,
                "deliverable": "Full-Stack AI Invoice Recovery Agent & Indic Voice Pipeline",
                "status": "OVERDUE",
                "payment_link_url": "https://rzp.io/i/demo_pay"
            },
            {
                "id": "inv-1042",
                "invoice_number": "INV-1042",
                "debtor_name": "Rahul Sharma",
                "debtor_company": "Acme Creative Studios",
                "debtor_phone": "+91 98765 43210",
                "debtor_email": "rahul@acmestudios.in",
                "amount": 45000,
                "amount_due": 45000,
                "currency": "INR",
                "due_date": "2026-10-15",
                "days_past_due": 14,
                "days_overdue": 14,
                "deliverable": "Figma UI/UX Design System & Mobile App Wireframes",
                "status": "OVERDUE",
                "payment_link_url": "https://rzp.io/i/inv1042"
            },
            {
                "id": "inv-1043",
                "invoice_number": "INV-1043",
                "debtor_name": "Vikram Patel",
                "debtor_company": "Apex Retail Solutions",
                "debtor_phone": "+91 91234 56789",
                "debtor_email": "vikram@apexretail.com",
                "amount": 28500,
                "amount_due": 28500,
                "currency": "INR",
                "due_date": "2026-10-05",
                "days_past_due": 24,
                "days_overdue": 24,
                "deliverable": "Custom Shopify Liquid Theme Development & Speed Optimization",
                "status": "OVERDUE",
                "payment_link_url": "https://rzp.io/i/inv1043"
            },
            {
                "id": "inv-1044",
                "invoice_number": "INV-1044",
                "debtor_name": "Priya Mehta",
                "debtor_company": "Nexus Digital Media",
                "debtor_phone": "+91 99887 76655",
                "debtor_email": "priya@nexusmedia.agency",
                "amount": 65000,
                "amount_due": 65000,
                "currency": "INR",
                "due_date": "2026-09-21",
                "days_past_due": 38,
                "days_overdue": 38,
                "deliverable": "Motion Graphics Brand Pack & 4x Video Reels Editing",
                "status": "OVERDUE",
                "payment_link_url": "https://rzp.io/i/inv1044"
            }
        ]

supabase_service = SupabaseService()
