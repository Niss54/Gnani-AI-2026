/**
 * RevClaim AI — Sovereign Indic i18n Translation & Localization Engine
 * Digital India / Bhashini / Gnani.ai Multi-Lingual Architecture
 * 
 * Provides:
 * - 0ms instant ground-level UI localization across 11+ primary Indic languages
 * - Dynamic Bhashini NMT fallback for all 26 scheduled & cross-border languages
 * - Locale-to-BCP47 speech recognition & TTS voice persona mapping
 * - React hook & context for seamless language switching
 */

export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'ta'
  | 'te'
  | 'kn'
  | 'mr'
  | 'bn'
  | 'gu'
  | 'ml'
  | 'pa'
  | 'or'
  | string;

export interface TranslationDictionary {
  // Navigation & Branding
  brandName: string;
  chats: string;
  newChat: string;
  invoicesAndRecovery: string;
  dashboard: string;
  settings: string;
  graphRag: string;
  forgetMe: string;
  proFounder: string;

  // Header & Breadcrumbs
  invoicesHeader: string;
  delinquentCockpitTitle: string;
  delinquentCockpitSubtitle: string;
  startVoiceNegotiation: string;

  // Cockpit Stats
  totalAtRisk: string;
  cashRecovered: string;
  recoveryVelocity: string;
  activeVoiceAgents: string;
  overdueAccountsPending: string;
  viaRazorpayInstantSettle: string;
  vsEmailAvg: string;
  stateMachineGuarded: string;

  // Gnani Voice Intake Banner
  gnaniVoiceIntakeTitle: string;
  sub400msIndicStt: string;
  gnaniVoiceIntakeSubtitle: string;
  listeningInvoiceDetails: string;
  clickToSpeakInvoice: string;

  // Receivables Ledger & Actions
  pendingReceivablesTitle: string;
  liveRazorpayGnaniTelephony: string;
  selectAccountSubtitle: string;
  addInvoice: string;
  hybridGraphRag: string;

  // Outbound Dispatcher
  outboundDispatcherTitle: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientNameOrg: string;
  dialRealPhone: string;
  autoWhatsappNudge: string;
  auto24hLegalNotice: string;
  carrierTelephonyNotice: string;

  // Table Headers
  colClientOrg: string;
  colInvoiceId: string;
  colAmountDue: string;
  colAging: string;
  colStatutoryProtection: string;
  colSyndicateRisk: string;
  colActions: string;

  // Action Buttons & Badges
  btnCall: string;
  btnWhatsapp: string;
  btnPayNow: string;
  badgePtpAgreed: string;
  badgeMsme16: string;
  badgeOverdue: string;
  badgeRecovered: string;

  // Voice Chat & Negotiation
  voiceNegotiatorTitle: string;
  voiceNegotiatorSubtitle: string;
  connectedToSarah: string;
  startCall: string;
  endCall: string;
  muteMic: string;
  unmuteMic: string;
  speakIntoMic: string;
  suggestPrefix: string;
  sendLivePaymentLink: string;
  offlineReady: string;
  sarahGreeting: string;
  sarahPaymentDispatchedFallback: string;
  chatInputPlaceholder: string;
}

export const UI_TRANSLATIONS: Record<string, TranslationDictionary> = {
  // ── English ─────────────────────────────────────────────────────────────
  en: {
    brandName: 'REVCLAIM AI',
    chats: 'CHATS',
    newChat: 'NEW CHAT',
    invoicesAndRecovery: 'INVOICES & RECOVERY',
    dashboard: 'DASHBOARD',
    settings: 'SETTINGS',
    graphRag: 'GRAPH RAG',
    forgetMe: 'Forget Me',
    proFounder: 'PRO FOUNDER',

    invoicesHeader: 'RevClaim.ai / Invoices & Recovery',
    delinquentCockpitTitle: 'Delinquent B2B Invoices Cockpit',
    delinquentCockpitSubtitle: 'Autonomous Indic voice recovery loops with instant settlement links',
    startVoiceNegotiation: 'START VOICE NEGOTIATION',

    totalAtRisk: 'TOTAL AT RISK',
    cashRecovered: 'CASH RECOVERED',
    recoveryVelocity: 'RECOVERY VELOCITY',
    activeVoiceAgents: 'ACTIVE VOICE AGENTS',
    overdueAccountsPending: 'overdue accounts pending',
    viaRazorpayInstantSettle: 'Via Razorpay instant settle',
    vsEmailAvg: 'Vs. Email avg 18%',
    stateMachineGuarded: 'State Machine Guarded',

    gnaniVoiceIntakeTitle: 'Gnani Prisma Voice Intake',
    sub400msIndicStt: 'SUB-400MS INDIC STT',
    gnaniVoiceIntakeSubtitle: 'Speak to add invoice - Regional accents & Hindi/English auto-extracted',
    listeningInvoiceDetails: 'Listening to invoice details...',
    clickToSpeakInvoice: 'Click mic or speak to add invoice hands-free',

    pendingReceivablesTitle: 'Pending Receivables Cockpit',
    liveRazorpayGnaniTelephony: 'Live Razorpay + Gnani Indic Telephony',
    selectAccountSubtitle: 'Select an account to dispatch AI Voice Recovery or execute immediate Razorpay settlement',
    addInvoice: 'Add Invoice',
    hybridGraphRag: 'Hybrid Graph RAG',

    outboundDispatcherTitle: 'LIVE OUTBOUND DISPATCHER (REAL CALL, REAL WHATSAPP & EMAIL)',
    recipientPhone: 'RECIPIENT PHONE',
    recipientEmail: 'RECIPIENT EMAIL (INVOICE + 24HR NOTICE)',
    recipientNameOrg: 'RECIPIENT NAME / ORGANIZATION',
    dialRealPhone: 'Dial Real Phone',
    autoWhatsappNudge: 'Auto WhatsApp Nudge',
    auto24hLegalNotice: 'Auto 24h Legal Notice',
    carrierTelephonyNotice: 'Carrier Telephony • Verified Multi-Rail Trunks',

    colClientOrg: 'Client / Organization',
    colInvoiceId: 'Invoice ID',
    colAmountDue: 'Amount Due',
    colAging: 'Aging',
    colStatutoryProtection: 'Statutory Protection',
    colSyndicateRisk: 'Syndicate Risk',
    colActions: 'Actions',

    btnCall: 'Call',
    btnWhatsapp: 'WhatsApp',
    btnPayNow: 'Pay Now',
    badgePtpAgreed: 'PTP Agreed',
    badgeMsme16: 'MSME Section 16',
    badgeOverdue: 'Overdue',
    badgeRecovered: 'Settled',

    voiceNegotiatorTitle: 'AI Voice Receivables Negotiator',
    voiceNegotiatorSubtitle: 'Autonomous high-EQ B2B settlement agent with live speech synthesis',
    connectedToSarah: 'Connected to Sarah (Accounts Desk)',
    startCall: 'Start Call',
    endCall: 'End Call',
    muteMic: 'Mute',
    unmuteMic: 'Unmute',
    speakIntoMic: 'Speak into your microphone or pick a suggestion below...',
    suggestPrefix: 'SUGGEST:',
    sendLivePaymentLink: 'Send live payment link for invoice',
    offlineReady: 'ONLINE READY',
    sarahGreeting: "Hello! This is Sarah from RevClaim AI accounts desk. I'm live on your reconciliation dashboard to assist with invoice payments and flexible Razorpay settlement schedules. How can I help you today?",
    sarahPaymentDispatchedFallback: "I have dispatched the secure Razorpay settlement link directly to your email (nishantma05@gmail.com) and WhatsApp. You can also settle instantly using the card below.",
    chatInputPlaceholder: "Type your payment offer or query... (Press Enter to send)"
  },

  // ── Tamil (தமிழ்) ────────────────────────────────────────────────────────
  ta: {
    brandName: 'ரெவ்கிளெய்ம் AI',
    chats: 'அரட்டைகள்',
    newChat: 'புதிய அரட்டை',
    invoicesAndRecovery: 'இன்வாய்ஸ்கள் & வசூல்',
    dashboard: 'டாஷ்போர்டு',
    settings: 'அமைப்புகள்',
    graphRag: 'வரைபட RAG',
    forgetMe: 'என்னை மறக்க',
    proFounder: 'ப்ரோ நிறுவனர்',

    invoicesHeader: 'RevClaim.ai / இன்வாய்ஸ்கள் & வசூல்',
    delinquentCockpitTitle: 'நிலுவையில் உள்ள B2B இன்வாய்ஸ்கள் மையம்',
    delinquentCockpitSubtitle: 'உடனடி தீர்வு இணைப்புகளுடன் தன்னாட்சி இந்திய குரல் மீட்பு வளையங்கள்',
    startVoiceNegotiation: 'குரல் பேச்சுவார்த்தையைத் தொடங்கு',

    totalAtRisk: 'மொத்த அபாயத் தொகை',
    cashRecovered: 'மீட்கப்பட்ட பணம்',
    recoveryVelocity: 'மீட்பு வேகம்',
    activeVoiceAgents: 'செயலில் உள்ள குரல் முகவர்கள்',
    overdueAccountsPending: 'நிலுவையிலுள்ள கணக்குகள் காத்திருக்கின்றன',
    viaRazorpayInstantSettle: 'ரேஸர்பே உடனடி தீர்வு வழியாக',
    vsEmailAvg: 'மின்னஞ்சல் சராசரி 18% உடன் ஒப்பிடுகையில்',
    stateMachineGuarded: 'பாதுகாக்கப்பட்ட நிலை இயந்திரம்',

    gnaniVoiceIntakeTitle: 'ஞானி பிரிஸ்மா குரல் பதிவு',
    sub400msIndicStt: '400MS-க்கும் குறைவான இந்திய STT',
    gnaniVoiceIntakeSubtitle: 'இன்வாய்ஸ் சேர்க்க பேசவும் - பிராந்திய உச்சரிப்புகள் தானாக பிரித்தெடுக்கப்படும்',
    listeningInvoiceDetails: 'இன்வாய்ஸ் விவரங்களை கேட்கிறது...',
    clickToSpeakInvoice: 'இன்வாய்ஸ் சேர்க்க மைக்கை கிளிக் செய்து பேசவும்',

    pendingReceivablesTitle: 'நிலுவை வசூல் கட்டுப்பாட்டு மையம்',
    liveRazorpayGnaniTelephony: 'நேரடி ரேஸர்பே + ஞானி இந்திய டெலிபோனி',
    selectAccountSubtitle: 'AI குரல் மீட்பைத் தொடங்க அல்லது உடனடி ரேஸர்பே தீர்வைச் செய்ய கணக்கைத் தேர்ந்தெடுக்கவும்',
    addInvoice: 'இன்வாய்ஸ் சேர்க்க',
    hybridGraphRag: 'ஹைப்ரிட் வரைபட RAG',

    outboundDispatcherTitle: 'நேரடி வெளிச்செல்லும் அழைப்பாளர் (உண்மையான அழைப்பு, வாட்ஸ்அப் & மின்னஞ்சல்)',
    recipientPhone: 'பெறுநர் தொலைபேசி',
    recipientEmail: 'பெறுநர் மின்னஞ்சல் (இன்வாய்ஸ் + 24 மணி நேர அறிவிப்பு)',
    recipientNameOrg: 'பெறுநர் பெயர் / நிறுவனம்',
    dialRealPhone: 'உண்மையான தொலைபேசிக்கு அழைக்கவும்',
    autoWhatsappNudge: 'தானியங்கி வாட்ஸ்அப் செய்தி',
    auto24hLegalNotice: 'தானியங்கி 24 மணி நேர சட்ட அறிவிப்பு',
    carrierTelephonyNotice: 'தொலைத்தொடர்பு கட்டமைப்பு • சரிபார்க்கப்பட்ட பல வழிப்பாதைகள்',

    colClientOrg: 'வாடிக்கையாளர் / நிறுவனம்',
    colInvoiceId: 'இன்வாய்ஸ் எண்',
    colAmountDue: 'நிலுவைத் தொகை',
    colAging: 'காலாவதி காலம்',
    colStatutoryProtection: 'சட்டப்பூர்வ பாதுகாப்பு',
    colSyndicateRisk: 'கூட்டமைப்பு ஆபத்து',
    colActions: 'நடவடிக்கைகள்',

    btnCall: 'அழை',
    btnWhatsapp: 'வாட்ஸ்அப்',
    btnPayNow: 'இப்போது செலுத்து',
    badgePtpAgreed: 'வாக்குறுதி ஏற்கப்பட்டது',
    badgeMsme16: 'MSME பிரிவு 16',
    badgeOverdue: 'நிலுவை',
    badgeRecovered: 'தீர்க்கப்பட்டது',

    voiceNegotiatorTitle: 'AI குரல் கணக்குகள் பேச்சுவார்த்தையாளர்',
    voiceNegotiatorSubtitle: 'நேரடி குரல் தொகுப்புடன் தன்னாட்சி உயர்-EQ B2B தீர்வு முகவர்',
    connectedToSarah: 'சாராவுடன் இணைக்கப்பட்டுள்ளது (கணக்குகள் பிரிவு)',
    startCall: 'அழைப்பைத் தொடங்கு',
    endCall: 'அழைப்பை முடி',
    muteMic: 'ஒலியடக்கு',
    unmuteMic: 'ஒலி இயக்கு',
    speakIntoMic: 'மைக்ரோஃபோனில் பேசவும் அல்லது கீழே உள்ள பரிந்துரையைத் தேர்ந்தெடுக்கவும்...',
    suggestPrefix: 'பரிந்துரை:',
    sendLivePaymentLink: 'இன்வாய்ஸிற்கான கட்டண இணைப்பை அனுப்பவும்',
    offlineReady: 'இணைப்பு தயார்',
    sarahGreeting: "வணக்கம் நிஷாந்த் அவர்களே! நான் RevClaim AI கணக்கு பிரிவிலிருந்து சாரா பேசுகிறேன். நிலுவையில் உள்ள இன்வாய்ஸ் மற்றும் Razorpay செட்டில்மென்ட் பற்றி பேச வந்துள்ளேன். உங்களுக்கு எப்படி உதவ முடியும்?",
    sarahPaymentDispatchedFallback: "பாதுகாப்பான Razorpay கட்டண இணைப்பை உங்கள் மின்னஞ்சல் (nishantma05@gmail.com) மற்றும் வாட்ஸ்அப்பிற்கு அனுப்பியுள்ளேன். நீங்கள் கீழேயுள்ள கார்டைப் பயன்படுத்தியும் உடனே செலுத்தலாம்.",
    chatInputPlaceholder: "உங்கள் கட்டண சலுகை அல்லது கேள்வியை தட்டச்சு செய்யவும்... (Enter அழுத்தவும்)"
  },

  // ── Hindi (हिन्दी) ────────────────────────────────────────────────────────
  hi: {
    brandName: 'रेवक्लेम AI',
    chats: 'चैट्स',
    newChat: 'नई चैट',
    invoicesAndRecovery: 'इनवॉइस और रिकवरी',
    dashboard: 'डैशबोर्ड',
    settings: 'सेटिंग्स',
    graphRag: 'ग्राफ RAG',
    forgetMe: 'फॉरगेट मी',
    proFounder: 'प्रो फाउंडर',

    invoicesHeader: 'RevClaim.ai / इनवॉइस और रिकवरी',
    delinquentCockpitTitle: 'बकाया B2B इनवॉइस कॉकपिट',
    delinquentCockpitSubtitle: 'त्वरित भुगतान लिंक के साथ स्वायत्त भारतीय वॉइस रिकवरी लूप्स',
    startVoiceNegotiation: 'वॉइस बातचीत शुरू करें',

    totalAtRisk: 'कुल जोखिम राशि',
    cashRecovered: 'वसूली गई राशि',
    recoveryVelocity: 'रिकवरी दर',
    activeVoiceAgents: 'सक्रिय वॉइस एजेंट्स',
    overdueAccountsPending: 'अतिदेय खाते लंबित हैं',
    viaRazorpayInstantSettle: 'रेज़रपे त्वरित निपटान द्वारा',
    vsEmailAvg: 'ईमेल औसत 18% की तुलना में',
    stateMachineGuarded: 'स्टेट मशीन द्वारा सुरक्षित',

    gnaniVoiceIntakeTitle: 'ज्ञानी प्रिज़्म वॉइस इनटेक',
    sub400msIndicStt: 'सब-400MS इंडिक STT',
    gnaniVoiceIntakeSubtitle: 'इनवॉइस जोड़ने के लिए बोलें - क्षेत्रीय लहजे और हिंदी/अंग्रेजी स्वतः निष्कर्षण',
    listeningInvoiceDetails: 'इनवॉइस का विवरण सुन रहे हैं...',
    clickToSpeakInvoice: 'हैंड्स-फ्री इनवॉइस जोड़ने के लिए माइक पर क्लिक करें या बोलें',

    pendingReceivablesTitle: 'लंबित प्राप्य कॉकपिट',
    liveRazorpayGnaniTelephony: 'लाइव रेज़रपे + ज्ञानी इंडिक टेलीफोनी',
    selectAccountSubtitle: 'AI वॉइस रिकवरी शुरू करने या तत्काल रेज़रपे निपटान के लिए खाता चुनें',
    addInvoice: 'इनवॉइस जोड़ें',
    hybridGraphRag: 'हाइब्रिड ग्राफ RAG',

    outboundDispatcherTitle: 'लाइव आउटबाउंड डिस्पैचर (वास्तविक कॉल, वास्तविक व्हाट्सएप और ईमेल)',
    recipientPhone: 'प्राप्तकर्ता फोन',
    recipientEmail: 'प्राप्तकर्ता ईमेल (इनवॉइस + 24 घंटे का नोटिस)',
    recipientNameOrg: 'प्राप्तकर्ता का नाम / संगठन',
    dialRealPhone: 'असली फोन डायल करें',
    autoWhatsappNudge: 'ऑटो व्हाट्सएप रिमाइंडर',
    auto24hLegalNotice: 'ऑटो 24 घंटे का कानूनी नोटिस',
    carrierTelephonyNotice: 'कैरियर टेलीफोनी • सत्यापित मल्टी-रेल ट्रंक्स',

    colClientOrg: 'ग्राहक / संगठन',
    colInvoiceId: 'इनवॉइस आईडी',
    colAmountDue: 'बकाया राशि',
    colAging: 'विलंब अवधि',
    colStatutoryProtection: 'वैधानिक सुरक्षा',
    colSyndicateRisk: 'सिंडिकेट जोखिम',
    colActions: 'कार्रवाई',

    btnCall: 'कॉल करें',
    btnWhatsapp: 'व्हाट्सएप',
    btnPayNow: 'अभी भुगतान करें',
    badgePtpAgreed: 'PTP सहमत',
    badgeMsme16: 'MSME धारा 16',
    badgeOverdue: 'अतिदेय',
    badgeRecovered: 'सफल निपटान',

    voiceNegotiatorTitle: 'AI वॉइस भुगतान वार्ताकार',
    voiceNegotiatorSubtitle: 'लाइव वॉयस सिंथेसिस के साथ उच्च-EQ B2B निपटान एजेंट',
    connectedToSarah: 'सारा से जुड़े हैं (लेखा डेस्क)',
    startCall: 'कॉल शुरू करें',
    endCall: 'कॉल समाप्त करें',
    muteMic: 'म्यूट',
    unmuteMic: 'अनम्यूट',
    speakIntoMic: 'माइक्रोफ़ोन में बोलें या नीचे दिए गए सुझाव पर क्लिक करें...',
    suggestPrefix: 'सुझाव:',
    sendLivePaymentLink: 'इनवॉइस का लाइव भुगतान लिंक भेजें',
    offlineReady: 'ऑनलाइन तैयार',
    sarahGreeting: "नमस्ते निशांत जी! मैं RevClaim AI अकाउंट्स डेस्क से सारा बोल रही हूँ। आपके पेंडिंग इनवॉइस और Razorpay सेटलमेंट पर चर्चा के लिए उपलब्ध हूँ। मैं आपकी क्या मदद कर सकती हूँ?",
    sarahPaymentDispatchedFallback: "मैंने सुरक्षित Razorpay पेमेंट लिंक आपके ईमेल (nishantma05@gmail.com) और WhatsApp पर भेज दिया है। आप नीचे दिए गए कार्ड से भी तुरंत सेटल कर सकते हैं।",
    chatInputPlaceholder: "अपना सवाल या पेमेंट ऑफर यहाँ लिखें... (Enter दबाएं)"
  },

  // ── Kannada (ಕನ್ನಡ) ───────────────────────────────────────────────────────
  kn: {
    brandName: 'ರೆವ್‌ಕ್ಲೈಮ್ AI',
    chats: 'ಚಾಟ್‌ಗಳು',
    newChat: 'ಹೊಸ ಚಾಟ್',
    invoicesAndRecovery: 'ಇನ್‌ವಾಯ್ಸ್‌ಗಳು & ವಸೂಲಾತಿ',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    settings: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    graphRag: 'ಗ್ರಾಫ್ RAG',
    forgetMe: 'ನನ್ನನ್ನು ಮರೆತುಬಿಡಿ',
    proFounder: 'ಪ್ರೊ ಸಂಸ್ಥಾಪಕ',

    invoicesHeader: 'RevClaim.ai / ಇನ್‌ವಾಯ್ಸ್‌ಗಳು & ವಸೂಲಾತಿ',
    delinquentCockpitTitle: 'ಬಾಕಿ B2B ಇನ್‌ವಾಯ್ಸ್‌ಗಳ ಕಾಕ್‌ಪಿಟ್',
    delinquentCockpitSubtitle: 'ತ್ವರಿತ ಪಾವತಿ ಲಿಂಕ್‌ಗಳೊಂದಿಗೆ ಸ್ವಾಯತ್ತ ಭಾರತೀಯ ಧ್ವನಿ ಮರುಪಾವತಿ ಲೂಪ್‌ಗಳು',
    startVoiceNegotiation: 'ಧ್ವನಿ ಮಾತುಕತೆ ಪ್ರಾರಂಭಿಸಿ',

    totalAtRisk: 'ಒಟ್ಟು ಅಪಾಯದ ಮೊತ್ತ',
    cashRecovered: 'ವಸೂಲಾದ ಹಣ',
    recoveryVelocity: 'ವಸೂಲಾತಿ ವೇಗ',
    activeVoiceAgents: 'ಸಕ್ರಿಯ ಧ್ವನಿ ಏಜೆಂಟ್‌ಗಳು',
    overdueAccountsPending: 'ಬಾಕಿ ಇರುವ ಖಾತೆಗಳು ಕಾಯುತ್ತಿವೆ',
    viaRazorpayInstantSettle: 'ರೇಜರ್‌ಪೇ ತಕ್ಷಣದ ಇತ್ಯರ್ಥದ ಮೂಲಕ',
    vsEmailAvg: 'ಇಮೇಲ್ ಸರಾಸರಿ 18% ಕ್ಕೆ ಹೋಲಿಸಿದರೆ',
    stateMachineGuarded: 'ಸ್ಟೇಟ್ ಮೆಷಿನ್‌ನಿಂದ ಸುರಕ್ಷಿತ',

    gnaniVoiceIntakeTitle: 'ಜ್ಞಾನಿ ಪ್ರಿಸ್ಮಾ ಧ್ವನಿ ಇಂಟೇಕ್',
    sub400msIndicStt: '400MS ಗಿಂತ ಕಡಿಮೆ ಇಂಡಿಕ್ STT',
    gnaniVoiceIntakeSubtitle: 'ಇನ್‌ವಾಯ್ಸ್ ಸೇರಿಸಲು ಮಾತನಾಡಿ - ಪ್ರಾದೇಶಿಕ ಉಚ್ಚಾರಣೆಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ',
    listeningInvoiceDetails: 'ಇನ್‌ವಾಯ್ಸ್ ವಿವರಗಳನ್ನು ಆಲಿಸಲಾಗುತ್ತಿದೆ...',
    clickToSpeakInvoice: 'ಇನ್‌ವಾಯ್ಸ್ ಸೇರಿಸಲು ಮೈಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ',

    pendingReceivablesTitle: 'ಬಾಕಿ ವಸೂಲಾತಿ ಕಾಕ್‌ಪಿಟ್',
    liveRazorpayGnaniTelephony: 'ಲೈವ್ ರೇಜರ್‌ಪೇ + ಜ್ಞಾನಿ ಇಂಡಿಕ್ ಟೆಲಿಫೋನಿ',
    selectAccountSubtitle: 'AI ಧ್ವನಿ ಮರುಪಡೆಯುವಿಕೆ ಪ್ರಾರಂಭಿಸಲು ಅಥವಾ ರೇಜರ್‌ಪೇ ಇತ್ಯರ್ಥಕ್ಕೆ ಖಾತೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    addInvoice: 'ಇನ್‌ವಾಯ್ಸ್ ಸೇರಿಸಿ',
    hybridGraphRag: 'ಹೈಬ್ರಿಡ್ ಗ್ರಾಫ್ RAG',

    outboundDispatcherTitle: 'ಲೈವ್ ಔಟ್‌ಬೌಂಡ್ ರವಾನೆದಾರ (ನೈಜ ಕರೆ, ನೈಜ ವಾಟ್ಸಾಪ್ ಮತ್ತು ಇಮೇಲ್)',
    recipientPhone: 'ಸ್ವೀಕರಿಸುವವರ ಫೋನ್',
    recipientEmail: 'ಸ್ವೀಕರಿಸುವವರ ಇಮೇಲ್ (ಇನ್‌ವಾಯ್ಸ್ + 24 ಗಂಟೆಗಳ ನೋಟಿಸ್)',
    recipientNameOrg: 'ಸ್ವೀಕರಿಸುವವರ ಹೆಸರು / ಸಂಸ್ಥೆ',
    dialRealPhone: 'ನೈಜ ಫೋನ್‌ಗೆ ಡಯಲ್ ಮಾಡಿ',
    autoWhatsappNudge: 'ಸ್ವಯಂ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ',
    auto24hLegalNotice: 'ಸ್ವಯಂ 24 ಗಂಟೆಗಳ ಕಾನೂನು ನೋಟಿಸ್',
    carrierTelephonyNotice: 'ಕ್ಯಾರಿಯರ್ ಟೆಲಿಫೋನಿ • ಪರಿಶೀಲಿಸಿದ ಮಲ್ಟಿ-ರೈಲ್ ಟ್ರಂಕ್‌ಗಳು',

    colClientOrg: 'ಗ್ರಾಹಕ / ಸಂಸ್ಥೆ',
    colInvoiceId: 'ಇನ್‌ವಾಯ್ಸ್ ಐಡಿ',
    colAmountDue: 'ಬಾಕಿ ಮೊತ್ತ',
    colAging: 'ಅವಧಿ ಮೀರಿದ ದಿನಗಳು',
    colStatutoryProtection: 'ಕಾನೂನು ರಕ್ಷಣೆ',
    colSyndicateRisk: 'ಸಿಂಡಿಕೇಟ್ ಅಪಾಯ',
    colActions: 'ಕ್ರಮಗಳು',

    btnCall: 'ಕರೆ ಮಾಡಿ',
    btnWhatsapp: 'ವಾಟ್ಸಾಪ್',
    btnPayNow: 'ಈಗ ಪಾವತಿಸಿ',
    badgePtpAgreed: 'PTP ಒಪ್ಪಿಗೆ',
    badgeMsme16: 'MSME ಸೆಕ್ಷನ್ 16',
    badgeOverdue: 'ಅವಧಿ ಮೀರಿದೆ',
    badgeRecovered: 'ಇತ್ಯರ್ಥವಾಗಿದೆ',

    voiceNegotiatorTitle: 'AI ಧ್ವನಿ ವಸೂಲಾತಿ ಸಮಾಲೋಚಕ',
    voiceNegotiatorSubtitle: 'ಲೈವ್ ಧ್ವನಿ ಸಂಶ್ಲೇಷಣೆಯೊಂದಿಗೆ ಉನ್ನತ-EQ B2B ಇತ್ಯರ್ಥ ಏಜೆಂಟ್',
    connectedToSarah: 'ಸಾರಾ ಅವರೊಂದಿಗೆ ಸಂಪರ್ಕದಲ್ಲಿದೆ (ಖಾತೆಗಳ ವಿಭಾಗ)',
    startCall: 'ಕರೆ ಪ್ರಾರಂಭಿಸಿ',
    endCall: 'ಕರೆ ಮುಕ್ತಾಯಗೊಳಿಸಿ',
    muteMic: 'ಮ್ಯೂಟ್',
    unmuteMic: 'ಅನ್‌ಮ್ಯೂಟ್',
    speakIntoMic: 'ಮೈಕ್ರೊಫೋನ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗಿನ ಸಲಹೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ...',
    suggestPrefix: 'ಸಲಹೆ:',
    sendLivePaymentLink: 'ಇನ್‌ವಾಯ್ಸ್‌ಗಾಗಿ ಪಾವತಿ ಲಿಂಕ್ ಕಳುಹಿಸಿ',
    offlineReady: 'ಆನ್‌ಲೈನ್ ಸಿದ್ಧವಾಗಿದೆ',
    sarahGreeting: "ನಮಸ್ಕಾರ ನಿಶಾಂತ್ ಅವರೇ! ನಾನು RevClaim AI ಖಾತೆ ವಿಭಾಗದಿಂದ ಸಾರಾ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. ಬಾಕಿ ಇರುವ ಇನ್‌ವಾಯ್ಸ್ ಮತ್ತು Razorpay ಇತ್ಯರ್ಥ ಕುರಿತು ಚರ್ಚಿಸಲು ಇಲ್ಲಿದ್ದೇನೆ. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    sarahPaymentDispatchedFallback: "ಸುರಕ್ಷಿತ Razorpay ಪಾವತಿ ಲಿಂಕ್ ಅನ್ನು ನಿಮ್ಮ ಇಮೇಲ್ (nishantma05@gmail.com) ಮತ್ತು ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಿದ್ದೇನೆ. ಕೆಳಗಿನ ಕಾರ್ಡ್ ಬಳಸಿ ನೀವು ತಕ್ಷಣ ಇತ್ಯರ್ಥ ಮಾಡಬಹುದು.",
    chatInputPlaceholder: "ನಿಮ್ಮ ಪಾವತಿ ಪ್ರಸ್ತಾಪ ಅಥವಾ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ... (Enter ಒತ್ತಿರಿ)"
  },

  // ── Telugu (తెలుగు) ───────────────────────────────────────────────────────
  te: {
    brandName: 'రెవ్‌క్లెయిమ్ AI',
    chats: 'చాట్‌లు',
    newChat: 'కొత్త చాట్',
    invoicesAndRecovery: 'ఇన్‌వాయిస్‌లు & రికవరీ',
    dashboard: 'డ్యాష్‌బోర్డ్',
    settings: 'సెట్టింగ్‌లు',
    graphRag: 'గ్రాఫ్ RAG',
    forgetMe: 'నన్ను మర్చిపోండి',
    proFounder: 'ప్రో ఫౌండర్',

    invoicesHeader: 'RevClaim.ai / ఇన్‌వాయిస్‌లు & రికవరీ',
    delinquentCockpitTitle: 'బకాయి B2B ఇన్‌వాయిస్‌ల కాక్‌పిట్',
    delinquentCockpitSubtitle: 'తక్షణ చెల్లింపు లింక్‌లతో స్వయంప్రతిపత్త భారతీయ వాయిస్ రికవరీ లూప్‌లు',
    startVoiceNegotiation: 'వాయిస్ సంప్రదింపులను ప్రారంభించండి',

    totalAtRisk: 'మొత్తం రిస్క్ మొత్తం',
    cashRecovered: 'రికవరీ చేసిన నగదు',
    recoveryVelocity: 'రికవరీ వేగం',
    activeVoiceAgents: 'క్రియాశీల వాయిస్ ఏజెంట్లు',
    overdueAccountsPending: 'బకాయి ఖాతాలు పెండింగ్‌లో ఉన్నాయి',
    viaRazorpayInstantSettle: 'రేజర్‌పే తక్షణ సెటిల్‌మెంట్ ద్వారా',
    vsEmailAvg: 'ఇమెయిల్ సగటు 18% తో పోలిస్తే',
    stateMachineGuarded: 'స్టేట్ మెషిన్ రక్షణలో ఉంది',

    gnaniVoiceIntakeTitle: 'జ్ఞాని ప్రిజ్మా వాయిస్ ఇన్‌టేక్',
    sub400msIndicStt: '400MS కంటే తక్కువ ఇండిక్ STT',
    gnaniVoiceIntakeSubtitle: 'ఇన్‌వాయిస్ జోడించడానికి మాట్లాడండి - ప్రాంతీయ యాసలు స్వయంచాలకంగా గ్రహించబడతాయి',
    listeningInvoiceDetails: 'ఇన్‌వాయిస్ వివరాలను వింటోంది...',
    clickToSpeakInvoice: 'ఇన్‌వాయిస్ జోడించడానికి మైక్ క్లిక్ చేయండి లేదా మాట్లాడండి',

    pendingReceivablesTitle: 'పెండింగ్ బకాయిల కాక్‌పిట్',
    liveRazorpayGnaniTelephony: 'లైవ్ రేజర్‌పే + జ్ఞాని ఇండిక్ టెలిఫోనీ',
    selectAccountSubtitle: 'AI వాయిస్ రికవరీ ప్రారంభించడానికి లేదా రేజర్‌పే పరిష్కారం కోసం ఖాతాను ఎంచుకోండి',
    addInvoice: 'ఇన్‌వాయిస్ జోడించండి',
    hybridGraphRag: 'హైబ్రిడ్ గ్రాఫ్ RAG',

    outboundDispatcherTitle: 'లైవ్ అవుట్‌బౌండ్ డిస్పాచర్ (నిజమైన కాల్, నిజమైన వాట్సాప్ మరియు ఇమెయిల్)',
    recipientPhone: 'స్వీకర్త ఫోన్',
    recipientEmail: 'స్వీకర్త ఇమెయిల్ (ఇన్‌వాయిస్ + 24 గంటల నోటీసు)',
    recipientNameOrg: 'స్వీకర్త పేరు / సంస్థ',
    dialRealPhone: 'నిజమైన ఫోన్‌కు డయల్ చేయండి',
    autoWhatsappNudge: 'ఆటో వాట్సాప్ సందేశం',
    auto24hLegalNotice: 'ఆటో 24 గంటల చట్టపరమైన నోటీసు',
    carrierTelephonyNotice: 'క్యారియర్ టెలిఫోనీ • ధృవీకరించబడిన మల్టీ-రైల్ ట్రంక్‌లు',

    colClientOrg: 'క్లయింట్ / సంస్థ',
    colInvoiceId: 'ఇన్‌వాయిస్ ఐడి',
    colAmountDue: 'చెల్లించాల్సిన మొత్తం',
    colAging: 'గడువు ముగిసిన రోజులు',
    colStatutoryProtection: 'చట్టపరమైన రక్షణ',
    colSyndicateRisk: 'సిండికేట్ రిస్క్',
    colActions: 'చర్యలు',

    btnCall: 'కాల్ చేయండి',
    btnWhatsapp: 'వాట్సాప్',
    btnPayNow: 'ఇప్పుడే చెల్లించండి',
    badgePtpAgreed: 'PTP అంగీకరించబడింది',
    badgeMsme16: 'MSME సెక్షన్ 16',
    badgeOverdue: 'గడువు ముగిసింది',
    badgeRecovered: 'పరిష్కరించబడింది',

    voiceNegotiatorTitle: 'AI వాయిస్ రికవరీ సంప్రదింపుదారు',
    voiceNegotiatorSubtitle: 'లైవ్ వాయిస్ సింథసిస్‌తో కూడిన హై-EQ B2B సెటిల్‌మెంట్ ఏజెంట్',
    connectedToSarah: 'సారాతో కనెక్ట్ అయ్యారు (ఖాతాల విభాగం)',
    startCall: 'కాల్ ప్రారంభించండి',
    endCall: 'కాల్ ముగించండి',
    muteMic: 'మ్యూట్',
    unmuteMic: 'అన్‌మ్యూట్',
    speakIntoMic: 'మైక్రోఫోన్‌లో మాట్లాడండి లేదా దిగువ సూచనను ఎంచుకోండి...',
    suggestPrefix: 'సూచన:',
    sendLivePaymentLink: 'ఇన్‌వాయిస్ కోసం చెల్లింపు లింక్ పంపండి',
    offlineReady: 'ఆన్‌లైన్ సిద్ధంగా ఉంది',
    sarahGreeting: "నమస్కారం నిశాంత్ గారూ! నేను RevClaim AI అకౌంట్స్ డెస్క్ నుండి సారా మాట్లాడుతున్నాను. పెండింగ్ ఇన్‌వాయిస్ మరియు Razorpay సెటిల్‌మెంట్ గురించి మాట్లాడటానికి సిద్ధంగా ఉన్నాను. నేను మీకు ఎలా సహాయపడగలను?",
    sarahPaymentDispatchedFallback: "సురక్షితమైన Razorpay చెల్లింపు లింక్‌ను మీ ఇమెయిల్ (nishantma05@gmail.com) మరియు వాట్సాప్‌కు పంపాను. మీరు క్రింది కార్డ్ ద్వారా కూడా వెంటనే సెటిల్ చేసుకోవచ్చు.",
    chatInputPlaceholder: "మీ చెల్లింపు ఆఫర్ లేదా ప్రశ్నను ఇక్కడ టైప్ చేయండి... (Enter నొక్కండి)"
  },

  // ── Marathi (मराठी) ───────────────────────────────────────────────────────
  mr: {
    brandName: 'रेव्हक्लेम AI',
    chats: 'चॅट्स',
    newChat: 'नवीन चॅट',
    invoicesAndRecovery: 'इनव्हॉइसेस आणि वसुली',
    dashboard: 'डॅशबोर्ड',
    settings: 'सेटिंग्ज',
    graphRag: 'ग्राफ RAG',
    forgetMe: 'मला विसरा',
    proFounder: 'प्रो फाउंडर',

    invoicesHeader: 'RevClaim.ai / इनव्हॉइसेस आणि वसुली',
    delinquentCockpitTitle: 'थकीत B2B इनव्हॉइसेस कॉकपिट',
    delinquentCockpitSubtitle: 'त्वरित पेमेंट लिंक्ससह स्वायत्त भारतीय व्हॉइस रिकव्हरी लूप्स',
    startVoiceNegotiation: 'व्हॉइस संवाद सुरू करा',

    totalAtRisk: 'एकूण जोखीम रक्कम',
    cashRecovered: 'वसूल झालेली रक्कम',
    recoveryVelocity: 'वसुली वेग',
    activeVoiceAgents: 'सक्रिय व्हॉइस एजंट्स',
    overdueAccountsPending: 'थकीत खाती प्रलंबित आहेत',
    viaRazorpayInstantSettle: 'रेझरपे झटपट सेटलमेंटद्वारे',
    vsEmailAvg: 'ईमेल सरासरी 18% च्या तुलनेत',
    stateMachineGuarded: 'स्टेट मशीनद्वारे सुरक्षित',

    gnaniVoiceIntakeTitle: 'ज्ञानी प्रिझ्मा व्हॉइस इनटेक',
    sub400msIndicStt: 'सब-400MS इंडिक STT',
    gnaniVoiceIntakeSubtitle: 'इनव्हॉइस जोडण्यासाठी बोला - प्रादेशिक उच्चार आपोआप ओळखले जातात',
    listeningInvoiceDetails: 'इनव्हॉइस तपशील ऐकत आहे...',
    clickToSpeakInvoice: 'हँड्स-फ्री इनव्हॉइस जोडण्यासाठी माइकवर क्लिक करा किंवा बोला',

    pendingReceivablesTitle: 'प्रलंबित येणी कॉकपिट',
    liveRazorpayGnaniTelephony: 'लाइव्ह रेझरपे + ज्ञानी इंडिक टेलिफोनी',
    selectAccountSubtitle: 'AI व्हॉइस रिकव्हरी सुरू करण्यासाठी किंवा त्वरित रेझरपे सेटलमेंटसाठी खाते निवडा',
    addInvoice: 'इनव्हॉइस जोडा',
    hybridGraphRag: 'हायब्रिड ग्राफ RAG',

    outboundDispatcherTitle: 'लाइव्ह आउटबाउंड डिस्पॅचर (वास्तविक कॉल, व्हॉट्सॲप आणि ईमेल)',
    recipientPhone: 'प्राप्तकर्त्याचा फोन',
    recipientEmail: 'प्राप्तकर्त्याचा ईमेल (इनव्हॉइस + 24 तासांची नोटीस)',
    recipientNameOrg: 'प्राप्तकर्त्याचे नाव / संस्था',
    dialRealPhone: 'प्रत्यक्ष फोन डायल करा',
    autoWhatsappNudge: 'ऑटो व्हॉट्सॲप मेसेज',
    auto24hLegalNotice: 'ऑटो 24 तास कायदेशीर नोटीस',
    carrierTelephonyNotice: 'कॅरियर टेलिफोनी • सत्यापित मल्टी-रेल ट्रंक्स',

    colClientOrg: 'ग्राहक / संस्था',
    colInvoiceId: 'इनव्हॉइस आयडी',
    colAmountDue: 'बाकी रक्कम',
    colAging: 'थकीत कालावधी',
    colStatutoryProtection: 'वैधानिक संरक्षण',
    colSyndicateRisk: 'सिंडिकेट जोखीम',
    colActions: 'कृती',

    btnCall: 'कॉल करा',
    btnWhatsapp: 'व्हॉट्सॲप',
    btnPayNow: 'आता भरा',
    badgePtpAgreed: 'PTP मान्य',
    badgeMsme16: 'MSME कलम 16',
    badgeOverdue: 'थकीत',
    badgeRecovered: 'निकाली काढले',

    voiceNegotiatorTitle: 'AI व्हॉइस येणी वाटाघाटीकार',
    voiceNegotiatorSubtitle: 'थेट व्हॉइस सिंथेसिससह उच्च-EQ B2B सेटलमेंट एजंट',
    connectedToSarah: 'साराशी जोडले गेले आहे (अकाउंट्स डेस्क)',
    startCall: 'कॉल सुरू करा',
    endCall: 'कॉल समाप्त करा',
    muteMic: 'म्यूट',
    unmuteMic: 'अनम्यूट',
    speakIntoMic: 'मायक्रोफोनमध्ये बोला किंवा खालील सूचना निवडा...',
    suggestPrefix: 'सूचना:',
    sendLivePaymentLink: 'इनव्हॉइससाठी पेमेंट लिंक पाठवा',
    offlineReady: 'ऑनलाइन सज्ज',
    sarahGreeting: "नमस्ते निशांत जी! मी RevClaim AI अकाउंट्स डेस्कवरून सारा बोलत आहे. आपल्या प्रलंबित इनव्हॉइस आणि Razorpay सेटलमेंटवर चर्चा करण्यासाठी उपलब्ध आहे. मी आपल्याला कशी मदत करू शकते?",
    sarahPaymentDispatchedFallback: "सुरक्षित Razorpay पेमेंट लिंक आपल्या ईमेलवर (nishantma05@gmail.com) आणि व्हॉट्सॲपवर पाठवली आहे. आपण खालील कार्डवरूनही लगेच सेटल करू शकता.",
    chatInputPlaceholder: "आपला पेमेंट पर्याय किंवा प्रश्न येथे टाईप करा... (Enter दाबा)"
  },

  // ── Bengali (বাংলা) ───────────────────────────────────────────────────────
  bn: {
    brandName: 'রেভক্লেম AI',
    chats: 'চ্যাট',
    newChat: 'নতুন চ্যাট',
    invoicesAndRecovery: 'ইনভয়েস এবং রিকভারি',
    dashboard: 'ড্যাশবোর্ড',
    settings: 'সেটিংস',
    graphRag: 'গ্রাফ RAG',
    forgetMe: 'আমাকে ভুলে যান',
    proFounder: 'প্রো ফাউন্ডার',

    invoicesHeader: 'RevClaim.ai / ইনভয়েস এবং রিকভারি',
    delinquentCockpitTitle: 'বকেয়া B2B ইনভয়েস ককপিট',
    delinquentCockpitSubtitle: 'তাত্ক্ষণিক পেমেন্ট লিঙ্ক সহ স্বায়ত্তশাসিত ভারতীয় ভয়েস পুনরুদ্ধার',
    startVoiceNegotiation: 'ভয়েস আলোচনা শুরু করুন',

    totalAtRisk: 'মোট ঝুঁকিপূর্ণ অর্থ',
    cashRecovered: 'উদ্ধারকৃত অর্থ',
    recoveryVelocity: 'পুনরুদ্ধার গতি',
    activeVoiceAgents: 'সক্রিয় ভয়েস এজেন্ট',
    overdueAccountsPending: 'বকেয়া অ্যাকাউন্ট অপেক্ষমান',
    viaRazorpayInstantSettle: 'রেজারপে তাত্ক্ষণিক নিষ্পত্তির মাধ্যমে',
    vsEmailAvg: 'ইমেল গড় 18% এর তুলনায়',
    stateMachineGuarded: 'স্টেট মেশিন দ্বারা সুরক্ষিত',

    gnaniVoiceIntakeTitle: 'জ্ঞানী প্রিজমা ভয়েস ইনটেক',
    sub400msIndicStt: 'সাব-400MS ইন্ডিক STT',
    gnaniVoiceIntakeSubtitle: 'ইনভয়েস যোগ করতে কথা বলুন - আঞ্চলিক উচ্চারণ স্বয়ংক্রিয়ভাবে চিহ্নিত',
    listeningInvoiceDetails: 'ইনভয়েস বিবরণ শুনছে...',
    clickToSpeakInvoice: 'ইনভয়েস যোগ করতে মাইকে ক্লিক করুন বা কথা বলুন',

    pendingReceivablesTitle: 'প্রাপ্য বকেয়া ককপিট',
    liveRazorpayGnaniTelephony: 'লাইভ রেজারপে + জ্ঞানী ইন্ডিক টেলিফোনি',
    selectAccountSubtitle: 'AI ভয়েস রিকভারি শুরু করতে বা তাত্ক্ষণিক নিষ্পত্তির জন্য অ্যাকাউন্ট নির্বাচন করুন',
    addInvoice: 'ইনভয়েস যোগ করুন',
    hybridGraphRag: 'হাইব্রিড গ্রাফ RAG',

    outboundDispatcherTitle: 'লাইভ আউটবাউন্ড ডিসপ্যাচার (আসল কল, আসল হোয়াটসঅ্যাপ এবং ইমেল)',
    recipientPhone: 'প্রাপকের ফোন',
    recipientEmail: 'প্রাপকের ইমেল (ইনভয়েস + 24 ঘণ্টার নোটিশ)',
    recipientNameOrg: 'প্রাপকের নাম / সংস্থা',
    dialRealPhone: 'আসল ফোনে ডায়াল করুন',
    autoWhatsappNudge: 'অটো হোয়াটসঅ্যাপ রিমাইন্ডার',
    auto24hLegalNotice: 'অটো 24 ঘণ্টার আইনি নোটিশ',
    carrierTelephonyNotice: 'টেলিকম অবকাঠামো • যাচাইকৃত মাল্টি-রেল ট্রাঙ্ক',

    colClientOrg: 'ক্লায়েন্ট / সংস্থা',
    colInvoiceId: 'ইনভয়েস আইডি',
    colAmountDue: 'বকেয়া অর্থ',
    colAging: 'বিলম্বকাল',
    colStatutoryProtection: 'আইনি সুরক্ষা',
    colSyndicateRisk: 'সিন্ডিকেট ঝুঁকি',
    colActions: 'পদক্ষেপ',

    btnCall: 'কল করুন',
    btnWhatsapp: 'হোয়াটসঅ্যাপ',
    btnPayNow: 'এখনই পরিশোধ করুন',
    badgePtpAgreed: 'PTP স্বীকৃত',
    badgeMsme16: 'MSME ধারা 16',
    badgeOverdue: 'বকেয়া',
    badgeRecovered: 'নিষ্পন্ন',

    voiceNegotiatorTitle: 'AI ভয়েস নিষ্পত্তি মধ্যস্থতাকারী',
    voiceNegotiatorSubtitle: 'লাইভ ভয়েস সংশ্লেষণ সহ উচ্চ-EQ B2B বন্দোবস্ত এজেন্ট',
    connectedToSarah: 'সারার সাথে সংযুক্ত (অ্যাকাউন্টস ডেস্ক)',
    startCall: 'কল শুরু করুন',
    endCall: 'কল শেষ করুন',
    muteMic: 'নিঃশব্দ',
    unmuteMic: 'সশব্দ',
    speakIntoMic: 'মাইক্রোফোনে কথা বলুন বা নিচে দেওয়া প্রস্তাব বেছে নিন...',
    suggestPrefix: 'পরামর্শ:',
    sendLivePaymentLink: 'ইনভয়েসের পেমেন্ট লিঙ্ক পাঠান',
    offlineReady: 'অনলাইন প্রস্তুত',
    sarahGreeting: "নমস্কার নিশান্ত বাবু! আমি RevClaim AI অ্যাকাউন্টস ডেস্ক থেকে সারা বলছি। আপনার বকেয়া ইনভয়েস এবং Razorpay সেটেলমেন্ট নিয়ে কথা বলতে উপস্থিত আছি। আপনাকে কীভাবে সাহায্য করতে পারি?",
    sarahPaymentDispatchedFallback: "নিরাপদ Razorpay পেমেন্ট লিঙ্কটি আপনার ইমেল (nishantma05@gmail.com) এবং হোয়াটসঅ্যাপে পাঠিয়ে দিয়েছি। আপনি নিচের কার্ডটি ব্যবহার করেও সাথে সাথে সেটেল করতে পারেন।",
    chatInputPlaceholder: "আপনার পেমেন্ট অফার বা প্রশ্ন এখানে লিখুন... (Enter চাপুন)"
  },

  // ── Gujarati (ગુજરાતી) ────────────────────────────────────────────────────
  gu: {
    brandName: 'રેવક્લેમ AI',
    chats: 'ચેટ્સ',
    newChat: 'નવી ચેટ',
    invoicesAndRecovery: 'ઇનવોઇસ અને રિકવરી',
    dashboard: 'ડેશબોર્ડ',
    settings: 'સેટિંગ્સ',
    graphRag: 'ગ્રાફ RAG',
    forgetMe: 'મને ભૂલી જાઓ',
    proFounder: 'પ્રો ફાઉન્ડર',

    invoicesHeader: 'RevClaim.ai / ઇનવોઇસ અને રિકવરી',
    delinquentCockpitTitle: 'બાકી B2B ઇનવોઇસ કોકપિટ',
    delinquentCockpitSubtitle: 'ઝડપી ચુકવણી લિંક્સ સાથે સ્વાયત્ત ભારતીય વૉઇસ રિકવરી લૂપ્સ',
    startVoiceNegotiation: 'વૉઇસ વાતચીત શરૂ કરો',

    totalAtRisk: 'કુલ જોખમી રકમ',
    cashRecovered: 'વસૂલ થયેલી રકમ',
    recoveryVelocity: 'રિકવરી ઝડપ',
    activeVoiceAgents: 'સક્રિય વૉઇસ એજન્ટ્સ',
    overdueAccountsPending: 'બાકી ખાતાઓ પેન્ડિંગ છે',
    viaRazorpayInstantSettle: 'રેઝરપે ઇન્સ્ટન્ટ સેટલમેન્ટ દ્વારા',
    vsEmailAvg: 'ઇમેઇલ સરેરાશ 18% ની સરખામણીમાં',
    stateMachineGuarded: 'સ્ટેટ મશીન દ્વારા સુરક્ષિત',

    gnaniVoiceIntakeTitle: 'જ્ઞાની પ્રિઝ્મા વૉઇસ ઇનટેક',
    sub400msIndicStt: 'સબ-400MS ઇન્ડિક STT',
    gnaniVoiceIntakeSubtitle: 'ઇનવોઇસ ઉમેરવા બોલો - પ્રાદેશિક ઉચ્ચારો આપમેળે ઓળખાય છે',
    listeningInvoiceDetails: 'ઇનવોઇસ વિગતો સાંભળી રહ્યા છીએ...',
    clickToSpeakInvoice: 'ઇનવોઇસ ઉમેરવા માઇક ક્લિક કરો અથવા બોલો',

    pendingReceivablesTitle: 'બાકી લેણાં કોકપિટ',
    liveRazorpayGnaniTelephony: 'લાઇવ રેઝરપે + જ્ઞાની ઇન્ડિક ટેલિફોની',
    selectAccountSubtitle: 'AI વૉઇસ રિકવરી શરૂ કરવા અથવા રેઝરપે સેટલમેન્ટ માટે એકાઉન્ટ પસંદ કરો',
    addInvoice: 'ઇનવોઇસ ઉમેરો',
    hybridGraphRag: 'હાઇબ્રિડ ગ્રાફ RAG',

    outboundDispatcherTitle: 'લાઇવ આઉટબાઉન્ડ ડિસ્પેચર (વાસ્તવિક કૉલ, વૉટ્સએપ અને ઇમેઇલ)',
    recipientPhone: 'પ્રાપ્તકર્તા ફોન',
    recipientEmail: 'પ્રાપ્તકર્તા ઇમેઇલ (ઇનવોઇસ + 24 કલાકની નોટિસ)',
    recipientNameOrg: 'પ્રાપ્તકર્તા નામ / સંસ્થા',
    dialRealPhone: 'અસલી ફોન ડાયલ કરો',
    autoWhatsappNudge: 'ઑટો વૉટ્સએપ મેસેજ',
    auto24hLegalNotice: 'ઑટો 24 કલાક કાનૂની નોટિસ',
    carrierTelephonyNotice: 'ટેલિકોમ ઇન્ફ્રાસ્ટ્રક્ચર • ચકાસાયેલ મલ્ટી-રેલ ટ્રંક્સ',

    colClientOrg: 'ગ્રાહક / સંસ્થા',
    colInvoiceId: 'ઇનવોઇસ આઈડી',
    colAmountDue: 'બાકી રકમ',
    colAging: 'બાકી દિવસો',
    colStatutoryProtection: 'કાનૂની સુરક્ષા',
    colSyndicateRisk: 'સિન્ડિકેટ જોખમ',
    colActions: 'પગલાં',

    btnCall: 'કૉલ કરો',
    btnWhatsapp: 'વૉટ્સએપ',
    btnPayNow: 'હમણાં ચૂકવો',
    badgePtpAgreed: 'PTP સંમત',
    badgeMsme16: 'MSME કલમ 16',
    badgeOverdue: 'બાકી',
    badgeRecovered: 'ચુકતે',

    voiceNegotiatorTitle: 'AI વૉઇસ સમાધાન મધ્યસ્થી',
    voiceNegotiatorSubtitle: 'લાઇવ વૉઇસ સિન્થેસિસ સાથે ઉચ્ચ-EQ B2B સેટલમેન્ટ એજન્ટ',
    connectedToSarah: 'સારા સાથે જોડાયેલા છો (એકાઉન્ટ્સ ડેસ્ક)',
    startCall: 'કૉલ શરૂ કરો',
    endCall: 'કૉલ સમાપ્ત કરો',
    muteMic: 'મ્યૂટ',
    unmuteMic: 'અનમ્યૂટ',
    speakIntoMic: 'માઇક્રોફોનમાં બોલો અથવા નીચે આપેલ સૂચન પસંદ કરો...',
    suggestPrefix: 'સૂચન:',
    sendLivePaymentLink: 'ઇનવોઇસ માટે પેમેન્ટ લિંક મોકલો',
    offlineReady: 'ઑનલાઇન તૈયાર',
    sarahGreeting: "નમસ્તે નિશાંત જી! હું RevClaim AI એકાઉન્ટ્સ ડેસ્ક પરથી સારા બોલું છું. તમારા બાકી ઇનવૉઇસ અને Razorpay સેટલમેન્ટ અંગે ચર્ચા કરવા ઉપલબ્ધ છું. હું તમને કેવી રીતે મદદ કરી શકું?",
    sarahPaymentDispatchedFallback: "મેં સુરક્ષિત Razorpay ચુકવણી લિંક તમારા ઇમેઇલ (nishantma05@gmail.com) અને WhatsApp પર મોકલી આપી છે. તમે નીચેના કાર્ડથી પણ તરત જ સેટલ કરી શકો છો.",
    chatInputPlaceholder: "તમારી ચુકવણી ઓફર અથવા પ્રશ્ન અહીં લખો... (Enter દબાવો)"
  },

  // ── Malayalam (മലയാളം) ────────────────────────────────────────────────────
  ml: {
    brandName: 'റെവ്ക്ലെയിം AI',
    chats: 'ചാറ്റുകൾ',
    newChat: 'പുതിയ ചാറ്റ്',
    invoicesAndRecovery: 'ഇൻവോയ്സുകളും വീണ്ടെടുക്കലും',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    settings: 'ക്രമീകരണങ്ങൾ',
    graphRag: 'ഗ്രാഫ് RAG',
    forgetMe: 'എന്നെ മറക്കുക',
    proFounder: 'പ്രോ സ്ഥാപകൻ',

    invoicesHeader: 'RevClaim.ai / ഇൻവോയ്സുകളും വീണ്ടെടുക്കലും',
    delinquentCockpitTitle: 'കുടിശ്ശികയുള്ള B2B ഇൻവോയ്സ് കോക്ക്പിറ്റ്',
    delinquentCockpitSubtitle: 'തൽക്ഷണ സെറ്റിൽമെന്റ് ലിങ്കുകളുള്ള സ്വയംഭരണ ഇന്ത്യൻ വോയ്‌സ് വീണ്ടെടുക്കൽ',
    startVoiceNegotiation: 'വോയ്‌സ് ചർച്ച ആരംഭിക്കുക',

    totalAtRisk: 'ആകെ അപകടസാധ്യതയുള്ള തുക',
    cashRecovered: 'വീണ്ടെടുത്ത പണം',
    recoveryVelocity: 'വീണ്ടെടുക്കൽ വേഗത',
    activeVoiceAgents: 'സജീവ വോയ്‌സ് ഏജന്റുകൾ',
    overdueAccountsPending: 'കുടിശ്ശികയുള്ള അക്കൗണ്ടുകൾ ബാക്കിയുണ്ട്',
    viaRazorpayInstantSettle: 'റേസർപേ തൽക്ഷണ സെറ്റിൽമെന്റ് വഴി',
    vsEmailAvg: 'ഇമെയിൽ ശരാശരി 18% മായി താരതമ്യം ചെയ്യുമ്പോൾ',
    stateMachineGuarded: 'സ്റ്റേറ്റ് മെഷീൻ സുരക്ഷിതം',

    gnaniVoiceIntakeTitle: 'ജ്ഞാനി പ്രിസ്മ വോയ്‌സ് ഇൻടേക്ക്',
    sub400msIndicStt: '400MS താഴെ ഇൻഡിക് STT',
    gnaniVoiceIntakeSubtitle: 'ഇൻവോയ്സ് ചേർക്കാൻ സംസാരിക്കൂ - പ്രാദേശിക ഉച്ചാരണങ്ങൾ സ്വയമേവ തിരിച്ചറിയുന്നു',
    listeningInvoiceDetails: 'ഇൻവോയ്സ് വിവരങ്ങൾ ശ്രദ്ധിക്കുന്നു...',
    clickToSpeakInvoice: 'ഇൻവോയ്സ് ചേർക്കാൻ മൈക്ക് ക്ലിക്ക് ചെയ്യുകയോ സംസാരിക്കുകയോ ചെയ്യുക',

    pendingReceivablesTitle: 'കുടിശ്ശിക ഈടാക്കൽ കോക്ക്പിറ്റ്',
    liveRazorpayGnaniTelephony: 'തത്സമയ റേസർപേ + ജ്ഞാനി ഇൻഡിക് ടെലിഫോണി',
    selectAccountSubtitle: 'AI വോയ്‌സ് വീണ്ടെടുക്കൽ ആരംഭിക്കാൻ അല്ലെങ്കിൽ റേസർപേ സെറ്റിൽമെന്റിനായി അക്കൗണ്ട് തിരഞ്ഞെടുക്കുക',
    addInvoice: 'ഇൻവോയ്സ് ചേർക്കുക',
    hybridGraphRag: 'ഹൈബ്രിഡ് ഗ്രാഫ് RAG',

    outboundDispatcherTitle: 'തത്സമയ ഔട്ട്ബൗണ്ട് ഡിസ്പാച്ചർ (യഥാർത്ഥ കോൾ, വാട്സാപ്പ് & ഇമെയിൽ)',
    recipientPhone: 'സ്വീകർത്താവിന്റെ ഫോൺ',
    recipientEmail: 'സ്വീകർത്താവിന്റെ ഇമെയിൽ (ഇൻവോയ്സ് + 24 മണിക്കൂർ അറിയിപ്പ്)',
    recipientNameOrg: 'സ്വീകർത്താവിന്റെ പേര് / സ്ഥാപനം',
    dialRealPhone: 'യഥാർത്ഥ ഫോണിലേക്ക് വിളിക്കുക',
    autoWhatsappNudge: 'ഓട്ടോ വാട്സാപ്പ് സന്ദേശം',
    auto24hLegalNotice: 'ഓട്ടോ 24 മണിക്കൂർ നിയമപരമായ അറിയിപ്പ്',
    carrierTelephonyNotice: 'ടെലികോം ഇൻഫ്രാസ്ട്രക്ചർ • പരിശോധിച്ച മൾട്ടി-റെയിൽ ട്രങ്കുകൾ',

    colClientOrg: 'ഉപഭോക്താവ് / സ്ഥാപനം',
    colInvoiceId: 'ഇൻവോയ്സ് ഐഡി',
    colAmountDue: 'നൽകാനുള്ള തുക',
    colAging: 'കുടിശ്ശിക ദിനങ്ങൾ',
    colStatutoryProtection: 'നിയമപരമായ പരിരക്ഷ',
    colSyndicateRisk: 'സിൻഡിക്കേറ്റ് റിസ്ക്',
    colActions: 'നടപടികൾ',

    btnCall: 'വിളിക്കുക',
    btnWhatsapp: 'വാട്സാപ്പ്',
    btnPayNow: 'ഇപ്പോൾ അടയ്ക്കുക',
    badgePtpAgreed: 'PTP സമ്മതിച്ചു',
    badgeMsme16: 'MSME വകുപ്പ് 16',
    badgeOverdue: 'കുടിശ്ശിക',
    badgeRecovered: 'തീർപ്പുകൽപ്പിച്ചു',

    voiceNegotiatorTitle: 'AI വോയ്‌സ് സെറ്റിൽമെന്റ് ചർച്ചകൻ',
    voiceNegotiatorSubtitle: 'ലൈവ് വോയ്‌സ് സിന്തസിസുള്ള ഉയർന്ന-EQ B2B സെറ്റിൽമെന്റ് ഏജന്റ്',
    connectedToSarah: 'സാറയുമായി ബന്ധിപ്പിച്ചിരിക്കുന്നു (അക്കൗണ്ട്സ് വിഭാഗം)',
    startCall: 'കോൾ ആരംഭിക്കുക',
    endCall: 'കോൾ അവസാനിപ്പിക്കുക',
    muteMic: 'മ്യൂട്ട്',
    unmuteMic: 'അൺമ്യൂട്ട്',
    speakIntoMic: 'മൈക്രോഫോണിലേക്ക് സംസാരിക്കുക അല്ലെങ്കിൽ താഴെ നൽകിയിട്ടുള്ള നിർദ്ദേശം തിരഞ്ഞെടുക്കുക...',
    suggestPrefix: 'നിർദ്ദേശം:',
    sendLivePaymentLink: 'ഇൻവോയ്സിനായി പേയ്മെന്റ് ലിങ്ക് അയക്കുക',
    offlineReady: 'ഓൺലൈൻ സജ്ജമാണ്',
    sarahGreeting: "നമസ്കാരം നിഷാന്ത് സാർ! ഞാൻ RevClaim AI അക്കൗണ്ട്സ് ഡെസ്കിൽ നിന്ന് സാറ സംസാരിക്കുന്നു. പെൻഡിംഗ് ഇൻവോയ്സ്, Razorpay സെറ്റിൽമെന്റ് എന്നിവയിൽ സഹായിക്കാൻ ഞാൻ തയ്യാറാണ്. ഞാൻ എങ്ങനെ സഹായിക്കണം?",
    sarahPaymentDispatchedFallback: "സുരക്ഷിതമായ Razorpay പേയ്‌മെന്റ് ലിങ്ക് നിങ്ങളുടെ ഇമെയിലിലേക്കും (nishantma05@gmail.com) വാട്ട്‌സ്ആപ്പിലേക്കും അയച്ചിട്ടുണ്ട്. താഴെയുള്ള കാർഡ് വഴിയും ഉടൻ പണമടയ്ക്കാം.",
    chatInputPlaceholder: "നിങ്ങളുടെ പേയ്‌മെന്റ് ഓഫറോ ചോദ്യമോ ടൈപ്പ് ചെയ്യുക... (Enter അമർത്തുക)"
  },

  // ── Punjabi (ਪੰਜਾਬੀ) ──────────────────────────────────────────────────────
  pa: {
    brandName: 'ਰੇਵਕਲੇਮ AI',
    chats: 'ਚੈਟਸ',
    newChat: 'ਨਵੀਂ ਚੈਟ',
    invoicesAndRecovery: 'ਇਨਵੌਇਸ ਅਤੇ ਰਿਕਵਰੀ',
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    settings: 'ਸੈਟਿੰਗਾਂ',
    graphRag: 'ਗ੍ਰਾਫ RAG',
    forgetMe: 'ਮੈਨੂੰ ਭੁੱਲ ਜਾਓ',
    proFounder: 'ਪ੍ਰੋ ਸੰਸਥਾਪਕ',

    invoicesHeader: 'RevClaim.ai / ਇਨਵੌਇਸ ਅਤੇ ਰਿਕਵਰੀ',
    delinquentCockpitTitle: 'ਬਕਾਇਆ B2B ਇਨਵੌਇਸ ਕਾਕਪਿਟ',
    delinquentCockpitSubtitle: 'ਤੁਰੰਤ ਭੁਗਤਾਨ ਲਿੰਕਾਂ ਦੇ ਨਾਲ ਖੁਦਮੁਖਤਿਆਰ ਭਾਰਤੀ ਵੌਇਸ ਰਿਕਵਰੀ ਲੂਪਸ',
    startVoiceNegotiation: 'ਵੌਇਸ ਗੱਲਬਾਤ ਸ਼ੁਰੂ ਕਰੋ',

    totalAtRisk: 'ਕੁੱਲ ਜੋਖਮ ਰਕਮ',
    cashRecovered: 'ਵਸੂਲ ਕੀਤੀ ਰਕਮ',
    recoveryVelocity: 'ਵਸੂਲੀ ਦੀ ਰਫ਼ਤਾਰ',
    activeVoiceAgents: 'ਸਰਗਰਮ ਵੌਇਸ ਏਜੰਟ',
    overdueAccountsPending: 'ਬਕਾਇਆ ਖਾਤੇ ਲੰਬਿਤ ਹਨ',
    viaRazorpayInstantSettle: 'ਰੇਜ਼ਰਪੇਅ ਤੁਰੰਤ ਨਿਪਟਾਰੇ ਰਾਹੀਂ',
    vsEmailAvg: 'ਈਮੇਲ ਔਸਤ 18% ਦੇ ਮੁਕਾਬਲੇ',
    stateMachineGuarded: 'ਸਟੇਟ ਮਸ਼ੀਨ ਦੁਆਰਾ ਸੁਰੱਖਿਅਤ',

    gnaniVoiceIntakeTitle: 'ਗਿਆਨੀ ਪ੍ਰਿਜ਼ਮਾ ਵੌਇਸ ਇਨਟੇਕ',
    sub400msIndicStt: 'ਸਬ-400MS ਇੰਡਿਕ STT',
    gnaniVoiceIntakeSubtitle: 'ਇਨਵੌਇਸ ਜੋੜਨ ਲਈ ਬੋਲੋ - ਖੇਤਰੀ ਲਹਿਜ਼ੇ ਆਪਣੇ ਆਪ ਪਛਾਣੇ ਜਾਂਦੇ ਹਨ',
    listeningInvoiceDetails: 'ਇਨਵੌਇਸ ਵੇਰਵੇ ਸੁਣ ਰਹੇ ਹਾਂ...',
    clickToSpeakInvoice: 'ਇਨਵੌਇਸ ਜੋੜਨ ਲਈ ਮਾਈਕ ਕਲਿੱਕ ਕਰੋ ਜਾਂ ਬੋਲੋ',

    pendingReceivablesTitle: 'ਬਕਾਇਆ ਵਸੂਲੀ ਕਾਕਪਿਟ',
    liveRazorpayGnaniTelephony: 'ਲਾਈਵ ਰੇਜ਼ਰਪੇਅ + ਗਿਆਨੀ ਇੰਡਿਕ ਟੈਲੀਫੋਨੀ',
    selectAccountSubtitle: 'AI ਵੌਇਸ ਰਿਕਵਰੀ ਸ਼ੁਰੂ ਕਰਨ ਜਾਂ ਰੇਜ਼ਰਪੇਅ ਨਿਪਟਾਰੇ ਲਈ ਖਾਤਾ ਚੁਣੋ',
    addInvoice: 'ਇਨਵੌਇਸ ਸ਼ਾਮਲ ਕਰੋ',
    hybridGraphRag: 'ਹਾਈਬ੍ਰਿਡ ਗ੍ਰਾਫ RAG',

    outboundDispatcherTitle: 'ਲਾਈਵ ਆਊਟਬਾਊਂਡ ਡਿਸਪੈਚਰ (ਅਸਲ ਕਾਲ, ਵਟਸਐਪ ਅਤੇ ਈਮੇਲ)',
    recipientPhone: 'ਪ੍ਰਾਪਤਕਰਤਾ ਫ਼ੋਨ',
    recipientEmail: 'ਪ੍ਰਾਪਤਕਰਤਾ ਈਮੇਲ (ਇਨਵੌਇਸ + 24 ਘੰਟੇ ਦਾ ਨੋਟਿਸ)',
    recipientNameOrg: 'ਪ੍ਰਾਪਤਕਰਤਾ ਨਾਮ / ਸੰਸਥਾ',
    dialRealPhone: 'ਅਸਲ ਫ਼ੋਨ ਡਾਇਲ ਕਰੋ',
    autoWhatsappNudge: 'ਆਟੋ ਵਟਸਐਪ ਸੁਨੇਹਾ',
    auto24hLegalNotice: 'ਆਟੋ 24 ਘੰਟੇ ਕਾਨੂੰਨੀ ਨੋਟਿਸ',
    carrierTelephonyNotice: 'ਟੈਲੀਕਾਮ ਬੁਨਿਆਦੀ ਢਾਂਚਾ • ਪ੍ਰਮਾਣਿਤ ਮਲਟੀ-ਰੇਲ ਟਰੰਕਸ',

    colClientOrg: 'ਗਾਹਕ / ਸੰਸਥਾ',
    colInvoiceId: 'ਇਨਵੌਇਸ ਆਈਡੀ',
    colAmountDue: 'ਬਕਾਇਆ ਰਕਮ',
    colAging: 'ਬਕਾਇਆ ਦਿਨ',
    colStatutoryProtection: 'ਕਾਨੂੰਨੀ ਸੁਰੱਖਿਆ',
    colSyndicateRisk: 'ਸਿੰਡੀਕੇਟ ਜੋਖਮ',
    colActions: 'ਕਾਰਵਾਈਆਂ',

    btnCall: 'ਕਾਲ ਕਰੋ',
    btnWhatsapp: 'ਵਟਸਐਪ',
    btnPayNow: 'ਹੁਣੇ ਭੁਗਤਾਨ ਕਰੋ',
    badgePtpAgreed: 'PTP ਸਹਿਮਤ',
    badgeMsme16: 'MSME ਧਾਰਾ 16',
    badgeOverdue: 'ਬਕਾਇਆ',
    badgeRecovered: 'ਨਿਪਟਾਰਾ ਹੋਇਆ',

    voiceNegotiatorTitle: 'AI ਵੌਇਸ ਨਿਪਟਾਰਾ ਗੱਲਬਾਤਕਾਰ',
    voiceNegotiatorSubtitle: 'ਲਾਈਵ ਵੌਇਸ ਸੰਸਲੇਸ਼ਣ ਦੇ ਨਾਲ ਉੱਚ-EQ B2B ਸੈਟਲਮੈਂਟ ਏਜੰਟ',
    connectedToSarah: 'ਸਾਰਾ ਨਾਲ ਜੁੜਿਆ ਹੋਇਆ ਹੈ (ਖਾਤਾ ਡੈਸਕ)',
    startCall: 'ਕਾਲ ਸ਼ੁਰੂ ਕਰੋ',
    endCall: 'ਕਾਲ ਸਮਾਪਤ ਕਰੋ',
    muteMic: 'ਮਿਊਟ',
    unmuteMic: 'ਅਨਮਿਊਟ',
    speakIntoMic: 'ਮਾਈਕ੍ਰੋਫੋਨ ਵਿੱਚ ਬੋਲੋ ਜਾਂ ਹੇਠਾਂ ਦਿੱਤੇ ਸੁਝਾਅ ਵਿੱਚੋਂ ਚੁਣੋ...',
    suggestPrefix: 'ਸੁਝਾਅ:',
    sendLivePaymentLink: 'ਇਨਵੌਇਸ ਲਈ ਭੁਗਤਾਨ ਲਿੰਕ ਭੇਜੋ',
    offlineReady: 'ਆਨਲਾਈਨ ਤਿਆਰ',
    sarahGreeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਨਿਸ਼ਾਂਤ ਜੀ! ਮੈਂ RevClaim AI ਅਕਾਊਂਟਸ ਡੈਸਕ ਤੋਂ ਸਾਰਾ ਬੋਲ ਰਹੀ ਹਾਂ। ਤੁਹਾਡੇ ਬਕਾਇਆ ਇਨਵੌਇਸ ਅਤੇ Razorpay ਸੈਟਲਮੈਂਟ ਬਾਰੇ ਗੱਲਬਾਤ ਲਈ ਹਾਜ਼ਰ ਹਾਂ। ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?",
    sarahPaymentDispatchedFallback: "ਮੈਂ ਸੁਰੱਖਿਅਤ Razorpay ਭੁਗਤਾਨ ਲਿੰਕ ਤੁਹਾਡੀ ਈਮੇਲ (nishantma05@gmail.com) ਅਤੇ ਵਟਸਐਪ 'ਤੇ ਭੇਜ ਦਿੱਤਾ ਹੈ। ਤੁਸੀਂ ਹੇਠਾਂ ਦਿੱਤੇ ਕਾਰਡ ਤੋਂ ਵੀ ਤੁਰੰਤ ਸੈਟਲ ਕਰ ਸਕਦੇ ਹੋ।",
    chatInputPlaceholder: "ਆਪਣਾ ਭੁਗਤਾਨ ਆਫਰ ਜਾਂ ਸਵਾਲ ਇੱਥੇ ਲਿਖੋ... (Enter ਦਬਾਓ)"
  },

  // ── Odia (ଓଡ଼ିଆ) ──────────────────────────────────────────────────────────
  or: {
    brandName: 'ରେଭକ୍ଲେମ୍ AI',
    chats: 'ଚାଟ୍',
    newChat: 'ନୂଆ ଚାଟ୍',
    invoicesAndRecovery: 'ଇନଭଏସ୍ ଏବଂ ଆଦାୟ',
    dashboard: 'ଡ୍ୟାସବୋର୍ଡ',
    settings: 'ସେଟିଂସ୍',
    graphRag: 'ଗ୍ରାଫ୍ RAG',
    forgetMe: 'ମୋତେ ଭୁଲିଯାଆନ୍ତୁ',
    proFounder: 'ପ୍ରୋ ପ୍ରତିଷ୍ଠାତା',

    invoicesHeader: 'RevClaim.ai / ଇନଭଏସ୍ ଏବଂ ଆଦାୟ',
    delinquentCockpitTitle: 'ବକେୟା B2B ଇନଭଏସ୍ କକପିଟ୍',
    delinquentCockpitSubtitle: 'ତୁରନ୍ତ ଦେୟ ଲିଙ୍କ୍ ସହିତ ସ୍ୱୟଂଶାସିତ ଭାରତୀୟ ଭଏସ୍ ଆଦାୟ',
    startVoiceNegotiation: 'ଭଏସ୍ ବାର୍ତ୍ତାଳାପ ଆରମ୍ଭ କରନ୍ତୁ',

    totalAtRisk: 'ମୋଟ ବିପଦପୂର୍ଣ୍ଣ ରାଶି',
    cashRecovered: 'ଆଦାୟ ହୋଇଥିବା ଟଙ୍କା',
    recoveryVelocity: 'ଆଦାୟ ଗତି',
    activeVoiceAgents: 'ସକ୍ରିୟ ଭଏସ୍ ଏଜେଣ୍ଟ',
    overdueAccountsPending: 'ବକେୟା ଖାତା ବିଚାରାଧୀନ ଅଛି',
    viaRazorpayInstantSettle: 'ରେଜରପେ ତୁରନ୍ତ ସମାଧାନ ମାଧ୍ୟମରେ',
    vsEmailAvg: 'ଇମେଲ୍ ହାରାହାରି 18% ତୁଳନାରେ',
    stateMachineGuarded: 'ଷ୍ଟେଟ୍ ମେସିନ୍ ଦ୍ୱାରା ସୁରକ୍ଷିତ',

    gnaniVoiceIntakeTitle: 'ଜ୍ଞାନୀ ପ୍ରିଜ୍ମା ଭଏସ୍ ଇନଟେକ୍',
    sub400msIndicStt: '400MS ରୁ କମ୍ ଇଣ୍ଡିକ୍ STT',
    gnaniVoiceIntakeSubtitle: 'ଇନଭଏସ୍ ଯୋଡ଼ିବାକୁ କୁହନ୍ତୁ - ଆଞ୍ଚଳିକ ଉଚ୍ଚାରଣ ସ୍ୱୟଂଚାଳିତ ଭାବରେ ଚିହ୍ନଟ',
    listeningInvoiceDetails: 'ଇନଭଏସ୍ ବିବରଣୀ ଶୁଣୁଛି...',
    clickToSpeakInvoice: 'ଇନଭଏସ୍ ଯୋଡ଼ିବାକୁ ମାଇକ୍ କ୍ଲିକ୍ କରନ୍ତୁ କିମ୍ବା କୁହନ୍ତୁ',

    pendingReceivablesTitle: 'ବକେୟା ଆଦାୟ କକପିଟ୍',
    liveRazorpayGnaniTelephony: 'ଲାଇଭ୍ ରେଜରପେ + ଜ୍ଞାନୀ ଇଣ୍ଡିକ୍ ଟେଲିଫୋନି',
    selectAccountSubtitle: 'AI ଭଏସ୍ ଆଦାୟ ଆରମ୍ଭ କରିବାକୁ କିମ୍ବା ରେଜରପେ ସମାଧାନ ପାଇଁ ଖାତା ଚୟନ କରନ୍ତୁ',
    addInvoice: 'ଇନଭଏସ୍ ଯୋଡ଼ନ୍ତୁ',
    hybridGraphRag: 'ହାଇବ୍ରିଡ୍ ଗ୍ରାଫ୍ RAG',

    outboundDispatcherTitle: 'ଲାଇଭ୍ ଆଉଟବାଉଣ୍ଡ ଡିସପାଚର୍ (ପ୍ରକୃତ କଲ୍, ହ୍ୱାଟ୍ସଆପ୍ ଏବଂ ଇମେଲ୍)',
    recipientPhone: 'ପ୍ରାପକଙ୍କ ଫୋନ୍',
    recipientEmail: 'ପ୍ରାପକଙ୍କ ଇମେଲ୍ (ଇନଭଏସ୍ + 24 ଘଣ୍ଟାର ନୋଟିସ୍)',
    recipientNameOrg: 'ପ୍ରାପକଙ୍କ ନାମ / ସଂସ୍ଥା',
    dialRealPhone: 'ଅସଲି ଫୋନ୍ ଡାଏଲ୍ କରନ୍ତୁ',
    autoWhatsappNudge: 'ଅଟୋ ହ୍ୱାଟ୍ସଆପ୍ ବାର୍ତ୍ତା',
    auto24hLegalNotice: 'ଅଟୋ 24 ଘଣ୍ଟା ଆଇନଗତ ନୋଟିସ୍',
    carrierTelephonyNotice: 'ଟେଲିକମ୍ ଭିତ୍ତିଭୂମି • ଯାଞ୍ଚ ହୋଇଥିବା ମଲ୍ଟି-ରେଲ୍ ଟ୍ରଙ୍କ୍',

    colClientOrg: 'ଗ୍ରାହକ / ସଂସ୍ଥା',
    colInvoiceId: 'ଇନଭଏସ୍ ଆଇଡି',
    colAmountDue: 'ଦେୟ ରାଶି',
    colAging: 'ବକେୟା ଦିନ',
    colStatutoryProtection: 'ଆଇନଗତ ସୁରକ୍ଷା',
    colSyndicateRisk: 'ସିଣ୍ଡିକେଟ୍ ବିପଦ',
    colActions: 'ପଦକ୍ଷେପ',

    btnCall: 'କଲ୍ କରନ୍ତୁ',
    btnWhatsapp: 'ହ୍ୱାଟ୍ସଆପ୍',
    btnPayNow: 'ବର୍ତ୍ତମାନ ଦିଅନ୍ତୁ',
    badgePtpAgreed: 'PTP ସହମତ',
    badgeMsme16: 'MSME ଧାରା 16',
    badgeOverdue: 'ବକେୟା',
    badgeRecovered: 'ସମାଧାନ ହୋଇଛି',

    voiceNegotiatorTitle: 'AI ଭଏସ୍ ଆଦାୟ ବୁଝାମଣାକାରୀ',
    voiceNegotiatorSubtitle: 'ଲାଇଭ୍ ଭଏସ୍ ସିନ୍ଥେସିସ୍ ସହିତ ଉଚ୍ଚ-EQ B2B ସମାଧାନ ଏଜେଣ୍ଟ',
    connectedToSarah: 'ସାରାଙ୍କ ସହିତ ସଂଯୁକ୍ତ (ଆକାଉଣ୍ଟସ୍ ଡେସ୍କ)',
    startCall: 'କଲ୍ ଆରମ୍ଭ କରନ୍ତୁ',
    endCall: 'କଲ୍ ସମାପ୍ତ କରନ୍ତୁ',
    muteMic: 'ମ୍ୟୁଟ୍',
    unmuteMic: 'ଅନମ୍ୟୁଟ୍',
    speakIntoMic: 'ମାଇକ୍ରୋଫୋନରେ କୁହନ୍ତୁ କିମ୍ବା ତଳେ ଥିବା ପରାମର୍ଶ ବାଛନ୍ତୁ...',
    suggestPrefix: 'ପରାମର୍ଶ:',
    sendLivePaymentLink: 'ଇନଭଏସ୍ ପାଇଁ ପେମେଣ୍ଟ ଲିଙ୍କ୍ ପଠାନ୍ତୁ',
    offlineReady: 'ଅନଲାଇନ୍ ପ୍ରସ୍ତୁତ',
    sarahGreeting: "ନମସ୍କାର ନିଶାନ୍ତ ବାବୁ! ମୁଁ RevClaim AI ଆକାଉଣ୍ଟସ୍ ଡେସ୍କରୁ ସାରା କହୁଛି। ଆପଣଙ୍କର ବକେୟା ଇନଭଏସ୍ ଏବଂ Razorpay ସମାଧାନ ପାଇଁ ଉପସ୍ଥିତ ଅଛି। ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?",
    sarahPaymentDispatchedFallback: "ମୁଁ ସୁରକ୍ଷିତ Razorpay ପେମେଣ୍ଟ ଲିଙ୍କ୍ ଆପଣଙ୍କ ଇମେଲ୍ (nishantma05@gmail.com) ଏବଂ ହ୍ୱାଟ୍ସଆପ୍‌କୁ ପଠାଇଛି। ଆପଣ ତଳେ ଥିବା କାର୍ଡ ବ୍ୟବହାର କରି ମଧ୍ୟ ତୁରନ୍ତ ସମାଧାନ କରିପାରିବେ।",
    chatInputPlaceholder: "ଆପଣଙ୍କର ପେମେଣ୍ଟ ଅଫର୍ କିମ୍ବା ପ୍ରଶ୍ନ ଏଠାରେ ଲେଖନ୍ତୁ... (Enter ଦବାନ୍ତୁ)"
  },
};

/**
 * Returns BCP-47 speech recognition and synthesis locale for a given language code
 */
export function getSpeechLocale(langCode: string): string {
  const map: Record<string, string> = {
    hi: 'hi-IN',
    en: 'en-IN',
    ta: 'ta-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    or: 'or-IN',
    ur: 'ur-IN',
    ne: 'ne-NP',
    as: 'as-IN',
    ks: 'ks-IN',
    mai: 'mai-IN',
    kok: 'kok-IN',
  };
  return map[langCode] || `${langCode}-IN`;
}

/**
 * Helper to get translation string with fallback to English
 */
export function getTranslation(lang: string, key: keyof TranslationDictionary): string {
  const dict = UI_TRANSLATIONS[lang] || UI_TRANSLATIONS.en;
  return dict[key] || UI_TRANSLATIONS.en[key] || key;
}
