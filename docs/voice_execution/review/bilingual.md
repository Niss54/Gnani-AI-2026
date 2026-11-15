# Bilingual human review packet

Drafts are not approved. Check intent, language, financial facts, permission and whether the agent listened.
Read both caller and response. Edit the dataset in a new version when corrections are needed. Choose approve or reject in the companion decisions JSON.

## SEED-001-en (en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Are you a real person or an AI?
**Proposed reply:** I'm an AI billing assistant. You can ask to speak with a person.
**Intent/action:** ai_identity / reply

## SEED-001-hi-en (hi-en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Tum insaan ho ya AI?
**Proposed reply:** Main AI billing assistant hoon. Aap kisi person se baat karne ko keh sakte hain.
**Intent/action:** ai_identity / reply

## SEED-002-en (en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Who gave you permission to collect money from me?
**Proposed reply:** Please verify this follow-up with your usual business contact before paying.
**Intent/action:** trust / reply

## SEED-002-hi-en (hi-en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Tumhe mujhse paise maangne ki permission kisne di?
**Proposed reply:** Payment se pehle apne known business contact se is follow-up ko verify kar lijiye.
**Intent/action:** trust / reply

## SEED-003-en (en, development)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Why should I trust an AI with my payment?
**Proposed reply:** You don't need to rely on my word. Verify the invoice and payment destination with your usual contact.
**Intent/action:** trust / reply

## SEED-003-hi-en (hi-en, development)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Main AI par payment ke liye bharosa kyun karun?
**Proposed reply:** Sirf meri baat par payment mat kijiye. Invoice aur payment destination apne known contact se verify kar lijiye.
**Intent/action:** trust / reply

## SEED-004-en (en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Show me the invoice before asking me to pay.
**Proposed reply:** I can help request a verified invoice copy. Which existing contact channel would you prefer?
**Intent/action:** proof / clarify

## SEED-004-hi-en (hi-en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Paise maangne se pehle invoice dikhao.
**Proposed reply:** Verified invoice copy ki request mein help kar sakti hoon. Aap apna kaunsa existing contact channel prefer karenge?
**Intent/action:** proof / clarify

## SEED-005-en (en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** What proof do you have that the freelancer completed the work?
**Proposed reply:** I don't have completion evidence in this context. Your business contact needs to provide it.
**Intent/action:** proof / reply

## SEED-005-hi-en (hi-en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Kya proof hai ki freelancer ne kaam complete kiya hai?
**Proposed reply:** Is context mein completion ka proof available nahi hai. Aapke business contact ko woh dena hoga.
**Intent/action:** proof / reply

## SEED-006-en (en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Connect me to the freelancer. I want to discuss it with them.
**Proposed reply:** I'll request a person. I can confirm a connection only after someone accepts.
**Intent/action:** human_request / request_human_handoff

## SEED-006-hi-en (hi-en, train)

State: DISCUSSING

Facts: `{"business_name": "Apex Studio", "identity_verified": true}`

**user:** Freelancer se baat karwao, mujhe unse discuss karna hai.
**Proposed reply:** Main person se baat karne ki request karungi. Kisi ke accept karne ke baad hi connection confirm kar sakti hoon.
**Intent/action:** human_request / request_human_handoff
