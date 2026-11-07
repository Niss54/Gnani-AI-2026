import os
from typing import List, Dict, Any, Optional

class Mem0Service:
    def __init__(self):
        self.api_key = os.getenv("MEM0_API_KEY")
        self.in_memory_store: Dict[str, List[Dict[str, Any]]] = {}

    def add_interaction_memory(self, client_id: str, memory_text: str, metadata: Optional[Dict[str, Any]] = None):
        """
        Stores an episodic negotiation memory for a debtor (e.g. 'Requested split payment on Oct 29; promised Nov 6').
        """
        record = {
            "text": memory_text,
            "metadata": metadata or {},
            "timestamp": "2026-10-29T16:00:00Z"
        }
        
        if client_id not in self.in_memory_store:
            self.in_memory_store[client_id] = []
        self.in_memory_store[client_id].append(record)

        if self.api_key and not "your_" in self.api_key:
            # Live Mem0 cloud API call
            try:
                import requests
                requests.post(
                    "https://api.mem0.ai/v1/memories/",
                    headers={
                        "Authorization": f"Token {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messages": [{"role": "user", "content": memory_text}],
                        "user_id": client_id
                    },
                    timeout=3
                )
            except Exception as e:
                print(f"[Mem0 Warning]: {e}")

        return record

    def get_client_memories(self, client_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves all past interaction history and behavioral tendencies for this client.
        """
        return self.in_memory_store.get(client_id, [
            {
                "text": "Client typically delays payments by 15-20 days due to delayed customer retainers, but always honors 50% split offers.",
                "type": "behavioral_pattern"
            }
        ])

mem0_service = Mem0Service()
