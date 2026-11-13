using KisanGuru.Api.Models;

namespace KisanGuru.Api.Data;

/// <summary>
/// Starter content. Scheme facts were checked in Nov 2026 against official sources and news reports;
/// review them every season, because amounts and limits change. Crop numbers are general guides only:
/// farmers should follow their Soil Health Card and local Krishi Vigyan Kendra (KVK).
/// </summary>
public static class SeedData
{
    private static LocalizedText T(string hi, string en) => new(hi, en);

    public static readonly IReadOnlyList<Scheme> Schemes = new List<Scheme>
    {
        new("pm-kisan", "income",
            T("पीएम-किसान सम्मान निधि", "PM-KISAN Samman Nidhi"),
            T("ज़मीन वाले किसान परिवारों को हर साल ₹6,000 की सीधी मदद, ₹2,000 की तीन किस्तों में सीधे बैंक खाते में।",
              "Direct income support of ₹6,000 a year to landholding farmer families, paid in three instalments of ₹2,000 into the bank account."),
            new[]
            {
                T("₹6,000 प्रति वर्ष, तीन बराबर किस्तें", "₹6,000 per year in three equal instalments"),
                T("पैसा सीधे आधार से जुड़े बैंक खाते में (DBT)", "Money goes straight to the Aadhaar-linked bank account (DBT)")
            },
            new[]
            {
                T("pmkisan.gov.in पर 'New Farmer Registration' करें या नज़दीकी CSC केंद्र जाएं", "Register on pmkisan.gov.in under 'New Farmer Registration' or visit the nearest CSC centre"),
                T("e-KYC ज़रूर पूरा करें, नहीं तो किस्त रुक सकती है", "Complete e-KYC, or instalments may stop"),
                T("'Beneficiary Status' में अपनी किस्त की स्थिति देखें", "Check your instalment under 'Beneficiary Status'")
            },
            "https://pmkisan.gov.in", "155261 / 011-24300606"),

        new("pmfby", "insurance",
            T("प्रधानमंत्री फसल बीमा योजना (PMFBY)", "Pradhan Mantri Fasal Bima Yojana (PMFBY)"),
            T("कम प्रीमियम पर फसल बीमा। बाकी प्रीमियम केंद्र और राज्य सरकार देती है।",
              "Crop insurance at a low premium. The central and state governments pay the rest of the premium."),
            new[]
            {
                T("खरीफ अनाज व तिलहन: बीमित राशि का अधिकतम 2%", "Kharif food grains and oilseeds: at most 2% of sum insured"),
                T("रबी अनाज व तिलहन: अधिकतम 1.5%", "Rabi food grains and oilseeds: at most 1.5%"),
                T("वार्षिक व्यावसायिक / बागवानी फसलें: अधिकतम 5%", "Annual commercial / horticultural crops: at most 5%")
            },
            new[]
            {
                T("बैंक, CSC या pmfby.gov.in से बुवाई के मौसम की अंतिम तारीख से पहले नामांकन करें", "Enrol through your bank, a CSC or pmfby.gov.in before the season's last date"),
                T("स्थानीय आपदा से नुकसान हो तो 72 घंटे के अंदर 14447 पर सूचना दें", "Report local calamity losses within 72 hours on 14447")
            },
            "https://pmfby.gov.in", "14447"),

        new("kcc", "credit",
            T("किसान क्रेडिट कार्ड (KCC)", "Kisan Credit Card (KCC)"),
            T("खेती के खर्च के लिए सस्ता कर्ज़। समय पर चुकाने पर ब्याज लगभग 4% सालाना पड़ता है।",
              "Cheap short-term credit for farming costs. With on-time repayment the interest works out to about 4% a year."),
            new[]
            {
                T("7% ब्याज, समय पर चुकाने पर 3% की छूट, यानी असल ब्याज 4%", "7% interest with a 3% prompt-repayment incentive, so an effective 4%"),
                T("बजट 2025-26 में ब्याज छूट वाली सीमा ₹3 लाख से बढ़ाकर ₹5 लाख करने की घोषणा हुई; अपने बैंक से मौजूदा सीमा पूछें", "Budget 2025-26 announced raising the subsidised limit from ₹3 lakh to ₹5 lakh; ask your bank for the current limit"),
                T("बिना गारंटी (collateral-free) कर्ज़ ₹2 लाख तक", "Collateral-free loans up to ₹2 lakh"),
                T("पशुपालन, डेयरी और मछली पालन के लिए भी", "Also covers animal husbandry, dairy and fisheries")
            },
            new[]
            {
                T("अपने बैंक या सहकारी बैंक में ज़मीन के कागज़, आधार और फोटो लेकर आवेदन करें", "Apply at your bank or cooperative bank with land records, Aadhaar and a photo"),
                T("PM-KISAN लाभार्थी आसान फॉर्म से KCC ले सकते हैं", "PM-KISAN beneficiaries can apply with a simplified form")
            },
            "https://www.myscheme.gov.in/schemes/kcc", null),

        new("soil-health", "soil",
            T("मृदा स्वास्थ्य कार्ड", "Soil Health Card"),
            T("अपनी मिट्टी की मुफ्त जांच करवाएं और जानें कौन-सी खाद कितनी डालनी है।",
              "Get your soil tested and learn which fertiliser to use and how much."),
            new[]
            {
                T("मिट्टी में N, P, K, pH और सूक्ष्म पोषक तत्वों की जानकारी", "Shows N, P, K, pH and micronutrient levels in your soil"),
                T("ज़रूरत से ज़्यादा खाद का खर्च बचता है", "Saves money spent on excess fertiliser")
            },
            new[]
            {
                T("कृषि विभाग / KVK से मिट्टी का नमूना लेने के बारे में पूछें", "Ask the agriculture department or KVK about soil sampling"),
                T("soilhealth.dac.gov.in पर अपना कार्ड देखें", "View your card on soilhealth.dac.gov.in")
            },
            "https://soilhealth.dac.gov.in", null),

        new("enam", "market",
            T("ई-नाम (राष्ट्रीय कृषि बाज़ार)", "e-NAM (National Agriculture Market)"),
            T("ऑनलाइन मंडी जहाँ दूसरे बाज़ारों के खरीदार भी आपकी फसल पर बोली लगा सकते हैं।",
              "An online mandi where buyers from other markets can bid for your produce."),
            new[]
            {
                T("ज़्यादा खरीदार, बेहतर दाम की संभावना", "More buyers, a better chance of a good price"),
                T("भुगतान सीधे बैंक खाते में", "Payment straight to the bank account")
            },
            new[]
            {
                T("अपनी e-NAM मंडी या enam.gov.in पर पंजीकरण करें", "Register at your e-NAM mandi or on enam.gov.in")
            },
            "https://enam.gov.in", null),

        new("pm-kusum", "energy",
            T("पीएम-कुसुम (सोलर पंप)", "PM-KUSUM (solar pumps)"),
            T("सिंचाई के लिए सोलर पंप पर सब्सिडी, डीज़ल का खर्च बचाएं।",
              "Subsidy on solar irrigation pumps, to cut diesel costs."),
            new[]
            {
                T("डीज़ल और बिजली का खर्च कम", "Lower diesel and electricity costs"),
                T("कुछ राज्यों में अतिरिक्त बिजली बेचने की सुविधा", "In some states, surplus power can be sold")
            },
            new[]
            {
                T("अपने राज्य की नोडल एजेंसी के पोर्टल पर आवेदन करें (pmkusum.mnre.gov.in पर लिंक)", "Apply on your state nodal agency portal (links on pmkusum.mnre.gov.in)"),
                T("सब्सिडी की राशि राज्य के हिसाब से अलग होती है", "Subsidy amounts differ by state")
            },
            "https://pmkusum.mnre.gov.in", null)
    };

    public static readonly IReadOnlyList<Crop> Crops = new List<Crop>
    {
        new("wheat", "rabi", T("गेहूं", "Wheat"),
            T("1 से 25 नवंबर (समय पर बुवाई)", "1–25 November (timely sowing)"), 120, 140,
            T("40 किलो प्रति एकड़", "40 kg per acre"),
            T("4–6 सिंचाई; पहली सिंचाई बुवाई के 20–25 दिन बाद (CRI अवस्था) सबसे ज़रूरी", "4–6 irrigations; the first, 20–25 days after sowing (CRI stage), matters most"),
            new(48, 24, 16),
            new[]
            {
                T("बीज को बोने से पहले फफूंदनाशक से उपचारित करें", "Treat seed with a fungicide before sowing"),
                T("देर से बुवाई पर बीज दर 25% बढ़ाएं", "Raise the seed rate by 25% for late sowing")
            }),

        new("paddy", "kharif", T("धान", "Paddy (rice)"),
            T("नर्सरी मई–जून, रोपाई जून–जुलाई", "Nursery May–June, transplanting June–July"), 110, 150,
            T("रोपाई के लिए 12–16 किलो प्रति एकड़", "12–16 kg per acre for transplanting"),
            T("खेत में लगातार नमी रखें; बालियां निकलते समय पानी की कमी न होने दें", "Keep the field moist; avoid water stress at flowering"),
            new(48, 24, 16),
            new[]
            {
                T("21–25 दिन की पौध की रोपाई करें", "Transplant 21–25 day old seedlings"),
                T("जिंक की कमी में ज़िंक सल्फेट डालें (मिट्टी जांच के अनुसार)", "Apply zinc sulphate if soil test shows zinc deficiency")
            }),

        new("chana", "rabi", T("चना", "Chickpea (chana)"),
            T("अक्टूबर के मध्य से नवंबर के पहले हफ्ते तक", "Mid-October to the first week of November"), 100, 120,
            T("25–32 किलो प्रति एकड़ (दाने के आकार के अनुसार)", "25–32 kg per acre (depends on seed size)"),
            T("कम पानी वाली फसल; ज़रूरत हो तो फूल आने से पहले 1–2 सिंचाई", "Low-water crop; 1–2 irrigations before flowering if needed"),
            new(8, 16, 8),
            new[]
            {
                T("बुंदेलखंड जैसे कम पानी वाले इलाकों के लिए उपयुक्त", "Well suited to low-rainfall regions like Bundelkhand"),
                T("बीज को राइज़ोबियम कल्चर से उपचारित करें", "Treat seed with Rhizobium culture"),
                T("फली छेदक कीट पर नज़र रखें; फेरोमोन ट्रैप लगाएं", "Watch for pod borer; use pheromone traps")
            }),

        new("mustard", "rabi", T("सरसों", "Mustard"),
            T("अक्टूबर का पहला पखवाड़ा", "First half of October"), 110, 140,
            T("1.5–2 किलो प्रति एकड़", "1.5–2 kg per acre"),
            T("2 सिंचाई: फूल आने पर और फली बनने पर", "2 irrigations: at flowering and at pod formation"),
            new(32, 16, 16),
            new[]
            {
                T("सल्फर डालने से तेल की मात्रा बढ़ती है", "Sulphur improves oil content"),
                T("माहू (aphid) का प्रकोप जनवरी में ज़्यादा होता है", "Aphid attack peaks around January")
            }),

        new("soybean", "kharif", T("सोयाबीन", "Soybean"),
            T("जून के मध्य से जुलाई के पहले हफ्ते तक (अच्छी बारिश के बाद)", "Mid-June to early July (after good rain)"), 90, 110,
            T("लगभग 30 किलो प्रति एकड़", "About 30 kg per acre"),
            T("मुख्यतः बारिश पर; फली भरते समय सूखा हो तो एक सिंचाई", "Mostly rain-fed; one irrigation at pod filling if dry"),
            new(8, 24, 16),
            new[]
            {
                T("कम से कम 4 इंच बारिश के बाद ही बोएं", "Sow only after at least 4 inches of rain"),
                T("खेत में पानी रुकने न दें", "Do not let water stand in the field")
            }),

        new("maize", "kharif", T("मक्का", "Maize"),
            T("जून के अंत से जुलाई", "Late June to July"), 90, 110,
            T("लगभग 8 किलो प्रति एकड़", "About 8 kg per acre"),
            T("घुटने की ऊंचाई, फूल आने और दाना भरने पर पानी ज़रूरी", "Water is critical at knee-high, tasselling and grain filling"),
            new(48, 24, 16),
            new[]
            {
                T("फॉल आर्मीवर्म के लिए पत्तियों की गोभ जांचते रहें", "Check leaf whorls for fall armyworm")
            }),

        new("masoor", "rabi", T("मसूर", "Lentil (masoor)"),
            T("अक्टूबर के अंत से नवंबर के मध्य तक", "Late October to mid-November"), 110, 130,
            T("लगभग 16 किलो प्रति एकड़", "About 16 kg per acre"),
            T("कम पानी; ज़रूरत हो तो फली बनते समय एक सिंचाई", "Low water; one irrigation at pod formation if needed"),
            new(8, 16, 0),
            new[]
            {
                T("राइज़ोबियम और PSB कल्चर से बीज उपचार करें", "Treat seed with Rhizobium and PSB culture")
            }),

        new("moong", "zaid", T("मूंग", "Green gram (moong)"),
            T("जायद: मार्च–अप्रैल; खरीफ: जुलाई", "Zaid: March–April; Kharif: July"), 60, 75,
            T("8–10 किलो प्रति एकड़", "8–10 kg per acre"),
            T("जायद में 3–4 हल्की सिंचाई", "3–4 light irrigations in zaid"),
            new(8, 16, 0),
            new[]
            {
                T("गेहूं कटने के बाद खाली खेत में अतिरिक्त कमाई और मिट्टी में नाइट्रोजन", "Extra income on fields left empty after wheat, and adds nitrogen to soil")
            })
    };

    public static readonly IReadOnlyList<Helpline> Helplines = new List<Helpline>
    {
        new("kcc-call", T("किसान कॉल सेंटर", "Kisan Call Centre"), "1800-180-1551",
            T("खेती से जुड़े किसी भी सवाल के लिए, अपनी भाषा में", "Any farming question, in your own language")),
        new("pm-kisan", T("पीएम-किसान हेल्पलाइन", "PM-KISAN helpline"), "155261",
            T("किस्त, e-KYC और पंजीकरण की समस्याएं (011-24300606 भी)", "Instalment, e-KYC and registration problems (also 011-24300606)")),
        new("krph", T("कृषि रक्षक पोर्टल व हेल्पलाइन (फसल बीमा)", "Krishi Rakshak Portal & Helpline (crop insurance)"), "14447",
            T("फसल बीमा की शिकायत और नुकसान की सूचना", "Crop insurance complaints and loss reporting"))
    };

    /// <summary>Clearly marked sample prices, shown only when no data.gov.in API key is configured.</summary>
    public static readonly IReadOnlyList<MandiPrice> SampleMandiPrices = new List<MandiPrice>
    {
        new("Uttar Pradesh", "Jhansi", "Jhansi", "Wheat", "Dara", "SAMPLE", 2400, 2600, 2500),
        new("Uttar Pradesh", "Jhansi", "Moth", "Bengal Gram(Gram)(Whole)", "Desi", "SAMPLE", 5400, 5900, 5700),
        new("Uttar Pradesh", "Lalitpur", "Lalitpur", "Lentil (Masur)(Whole)", "Local", "SAMPLE", 6000, 6500, 6250),
        new("Uttar Pradesh", "Banda", "Banda", "Mustard", "Sarson(Black)", "SAMPLE", 5600, 6000, 5800),
        new("Madhya Pradesh", "Sagar", "Sagar", "Soyabean", "Yellow", "SAMPLE", 4200, 4600, 4450),
        new("Madhya Pradesh", "Chhatarpur", "Chhatarpur", "Wheat", "Lokwan", "SAMPLE", 2450, 2700, 2550),
        new("Madhya Pradesh", "Tikamgarh", "Tikamgarh", "Bengal Gram(Gram)(Whole)", "Desi", "SAMPLE", 5300, 5800, 5600),
        new("Punjab", "Ludhiana", "Khanna", "Paddy(Dhan)(Common)", "Common", "SAMPLE", 2300, 2400, 2350),
        new("Maharashtra", "Nashik", "Lasalgaon", "Onion", "Red", "SAMPLE", 1200, 2200, 1800),
        new("Rajasthan", "Kota", "Kota", "Maize", "Hybrid", "SAMPLE", 2000, 2250, 2150)
    };
}
