using KisanGuru.Api.Models;
using static KisanGuru.Api.Models.TaskKind;

namespace KisanGuru.Api.Data;

/// <summary>
/// Day-by-day work for each crop from field preparation to harvest, in days after sowing
/// (after transplanting for paddy). General guidance for timely-sown, medium-duration varieties
/// on the lines of ICAR / state agriculture university packages of practice. Doses are per acre;
/// the plan works out urea, DAP and MOP for the farmer's own field from the crop's N-P-K.
/// Always follow the Soil Health Card and the label on the pesticide pack.
/// </summary>
public static class CropCalendars
{
    private static LocalizedText T(string hi, string en) => new(hi, en);
    private static CalendarStage G(int from, int to, string hi, string en) => new(from, to, T(hi, en));

    // Shared steps
    private static CalendarStep PrepStep(int from, string hi, string en, string dHi, string dEn) =>
        new("prep", from, -1, TaskKind.Prep, T(hi, en), T(dHi, dEn));

    public static readonly IReadOnlyDictionary<string, CropCalendar> All = new Dictionary<string, CropCalendar>
    {
        ["wheat"] = new("wheat", false,
            new[]
            {
                G(0, 20, "अंकुरण", "Germination"), G(21, 45, "कल्ले निकलना", "Tillering"),
                G(46, 70, "गांठ बनना", "Jointing"), G(71, 90, "बाली व फूल", "Earing & flowering"),
                G(91, 115, "दाना भरना", "Grain filling"), G(116, 140, "पकना", "Ripening")
            },
            new CalendarStep[]
            {
                PrepStep(-10, "खेत की तैयारी", "Prepare the field",
                    "2–3 जुताई करके खेत समतल करें। मिट्टी सूखी हो तो बुवाई से पहले पलेवा (हल्की सिंचाई) करें। सड़ी गोबर खाद 2–3 ट्रॉली प्रति एकड़ डालें।",
                    "Plough 2–3 times and level the field. If the soil is dry, give a pre-sowing irrigation (palewa). Add 2–3 trolleys of well-rotted farmyard manure per acre."),
                new("sow", 0, 0, Sowing, T("गेहूं की बुवाई + बेसल खाद", "Sow wheat + basal fertiliser"),
                    T("बीज 40 किलो प्रति एकड़, कतार से कतार 20–22 सेमी। बीज को कार्बेन्डाज़िम या थायरम 2–3 ग्राम प्रति किलो बीज से उपचारित करें। पूरी DAP, पूरा पोटाश (MOP) और यूरिया का पहला हिस्सा बुवाई के समय कूंड़ में डालें।",
                      "Seed 40 kg per acre, rows 20–22 cm apart. Treat seed with carbendazim or thiram, 2–3 g per kg of seed. Put all the DAP, all the potash (MOP) and the first part of the urea in the furrow at sowing."),
                    UreaShare: 0.4, Basal: true),
                new("irr1", 20, 25, Irrigation, T("पहली सिंचाई — सबसे ज़रूरी (CRI)", "1st irrigation — the most important (CRI)"),
                    T("इस समय जड़ें निकलती हैं (क्राउन रूट)। यह सिंचाई छूटी तो पैदावार काफ़ी घटती है। हल्का पानी दें, खेत में पानी खड़ा न रहे।",
                      "Crown roots form now. Missing this watering cuts the yield a lot. Give a light irrigation; do not let water stand."),
                    IrrigatedOnly: true),
                new("urea1", 21, 26, Fertilizer, T("यूरिया की पहली टॉप ड्रेसिंग", "1st urea top-dressing"),
                    T("पहली सिंचाई के बाद जब खेत में पैर रखने लायक नमी हो, तब यूरिया छिड़कें। शाम को डालना अच्छा है।",
                      "Broadcast urea after the first irrigation, once you can walk in the field and the soil is moist. Evening is best."),
                    UreaShare: 0.3),
                new("weed", 30, 35, Weeding, T("खरपतवार नियंत्रण", "Weed control"),
                    T("गुल्ली डंडा, बथुआ जैसे खरपतवार के लिए सल्फोसल्फ्यूरॉन 75 WG 13.5 ग्राम प्रति एकड़, 120–150 लीटर पानी में फ्लैट-फैन नोज़ल से छिड़कें। या दो बार निराई-गुड़ाई करें। छिड़काव के समय मिट्टी में नमी रहे।",
                      "For weeds like gulli danda (Phalaris) and bathua, spray sulfosulfuron 75 WG, 13.5 g per acre in 120–150 litres of water with a flat-fan nozzle. Or hand-weed twice. Keep the soil moist when spraying.")),
                new("irr2", 40, 45, Irrigation, T("दूसरी सिंचाई (कल्ले निकलते समय)", "2nd irrigation (tillering)"),
                    T("कल्ले ज़्यादा निकलें इसके लिए पानी दें।", "Water now so the plants make more tillers."),
                    IrrigatedOnly: true),
                new("urea2", 42, 47, Fertilizer, T("यूरिया की दूसरी टॉप ड्रेसिंग", "2nd urea top-dressing"),
                    T("दूसरी सिंचाई के बाद बची हुई यूरिया डालें। इसके बाद यूरिया न डालें, फसल गिर सकती है।",
                      "Put the rest of the urea after the 2nd irrigation. Do not add urea after this — the crop may fall over (lodge)."),
                    UreaShare: 0.3),
                new("rust", 50, 75, Scouting, T("पीला रतुआ (येलो रस्ट) देखें", "Check for yellow rust"),
                    T("पत्तियों पर पीले पाउडर की धारियां दिखें तो प्रोपिकोनाज़ोल 25 EC 200 मिली प्रति एकड़, 200 लीटर पानी में छिड़कें। ठंडे, नम मौसम में ज़्यादा फैलता है।",
                      "If leaves show stripes of yellow powder, spray propiconazole 25 EC, 200 ml per acre in 200 litres of water. It spreads most in cool, damp weather.")),
                new("irr3", 60, 65, Irrigation, T("तीसरी सिंचाई (गांठ बनना)", "3rd irrigation (jointing)"),
                    T("गांठ बनते समय पानी दें।", "Water at the jointing stage."), IrrigatedOnly: true, Optional: true),
                new("aphid", 70, 90, Scouting, T("माहू (चेपा) देखें", "Check for aphids"),
                    T("बालियों और पत्तियों पर छोटे हरे कीट बहुत हों तो इमिडाक्लोप्रिड 17.8 SL 40 मिली प्रति एकड़ छिड़कें। थोड़े हों तो छिड़काव की ज़रूरत नहीं।",
                      "If ears and leaves have many small green insects, spray imidacloprid 17.8 SL, 40 ml per acre. If there are only a few, no spray is needed.")),
                new("irr4", 80, 85, Irrigation, T("चौथी सिंचाई — फूल आने पर (बहुत ज़रूरी)", "4th irrigation — at flowering (very important)"),
                    T("फूल आने पर पानी की कमी से दाने कम बनते हैं। तेज़ हवा हो तो सिंचाई न करें, फसल गिर सकती है।",
                      "Water shortage at flowering means fewer grains. Do not irrigate in strong wind — the crop may fall."),
                    IrrigatedOnly: true),
                new("irr5", 100, 105, Irrigation, T("पांचवीं सिंचाई (दूधिया अवस्था)", "5th irrigation (milk stage)"),
                    T("दाने में दूध भरते समय हल्का पानी दें।", "Give light water while the grain fills with milk."), IrrigatedOnly: true),
                new("irr6", 115, 120, Irrigation, T("आखिरी हल्की सिंचाई (दाना सख्त होना)", "Last light irrigation (dough stage)"),
                    T("गर्मी (लू) हो तो यह हल्की सिंचाई दाने को सिकुड़ने से बचाती है। हवा चलते समय न दें।",
                      "In hot winds (loo) this light watering stops the grain from shrivelling. Not during wind."),
                    IrrigatedOnly: true, Optional: true),
                new("harvest", 120, 140, Harvest, T("कटाई", "Harvest"),
                    T("जब दाने दांत से न टूटें और बालियां सुनहरी हो जाएं, तब कटाई करें। अनाज को अच्छी तरह सुखाकर (नमी 12% से कम) भंडार करें। नरवाई (पराली) न जलाएं।",
                      "Harvest when grains are too hard to bite and the ears turn golden. Dry the grain well (below 12% moisture) before storing. Do not burn the stubble."))
            }),

        ["paddy"] = new("paddy", true,
            new[]
            {
                G(-25, -1, "नर्सरी", "Nursery"), G(0, 30, "रोपाई व जमना", "Transplanting & establishment"),
                G(31, 55, "कल्ले निकलना", "Tillering"), G(56, 80, "गभोट व बाली", "Booting & panicle"),
                G(81, 100, "दाना भरना", "Grain filling"), G(101, 125, "पकना", "Ripening")
            },
            new CalendarStep[]
            {
                new("nursery", -25, -21, TaskKind.Prep, T("नर्सरी डालें", "Sow the nursery"),
                    T("एक एकड़ रोपाई के लिए 12–16 किलो बीज। बीज को कार्बेन्डाज़िम 2 ग्राम प्रति किलो से उपचारित करें। 21–25 दिन की पौध रोपें।",
                      "12–16 kg seed for one acre of transplanting. Treat seed with carbendazim, 2 g per kg. Transplant 21–25 day old seedlings.")),
                new("puddle", -3, -1, TaskKind.Prep, T("खेत तैयार करें (लेव/पडलिंग)", "Prepare the field (puddling)"),
                    T("पानी भरकर 2–3 बार जुताई करें और समतल करें। मेड़ें मज़बूत करें ताकि पानी रुके।",
                      "Flood and plough 2–3 times, then level. Strengthen the bunds so the water stays.")),
                new("sow", 0, 0, Sowing, T("रोपाई + बेसल खाद", "Transplant + basal fertiliser"),
                    T("एक जगह 2–3 पौधे, 20×15 सेमी दूरी पर रोपें। आखिरी लेव के समय पूरी DAP, पूरा पोटाश और यूरिया का पहला हिस्सा डालें। मिट्टी जांच में ज़िंक की कमी हो तो ज़िंक सल्फेट 10 किलो प्रति एकड़ डालें।",
                      "Plant 2–3 seedlings per spot, 20×15 cm apart. At the last puddling put all the DAP, all the potash and the first part of the urea. If the soil test shows zinc deficiency, add zinc sulphate 10 kg per acre."),
                    UreaShare: 0.3, Basal: true),
                new("preweed", 1, 3, Weeding, T("खरपतवारनाशी (रोपाई के 3 दिन के अंदर)", "Weedicide (within 3 days of transplanting)"),
                    T("प्रेटिलाक्लोर 50 EC 600 मिली या ब्यूटाक्लोर 50 EC 1.2 लीटर प्रति एकड़, 20–25 किलो रेत में मिलाकर खेत में बिखेरें। खेत में 3–5 सेमी पानी रहे।",
                      "Mix pretilachlor 50 EC 600 ml, or butachlor 50 EC 1.2 litres, per acre with 20–25 kg sand and spread it in the field. Keep 3–5 cm of water standing.")),
                new("water", 7, 10, Irrigation, T("खेत में पानी बनाए रखें", "Keep water in the field"),
                    T("कल्ले निकलने तक खेत में 2–5 सेमी पानी रखें। खेत में दरार न पड़ने दें।",
                      "Keep 2–5 cm of water until tillering. Never let the field crack."),
                    IrrigatedOnly: true),
                new("urea1", 21, 25, Fertilizer, T("यूरिया — कल्ले निकलते समय", "Urea — at tillering"),
                    T("यूरिया डालने से पहले खेत का पानी कम कर लें, 2 दिन बाद फिर भरें।",
                      "Lower the water before putting urea; refill after 2 days."),
                    UreaShare: 0.35),
                new("handweed", 25, 30, Weeding, T("निराई", "Hand weeding"),
                    T("बचे हुए खरपतवार हाथ से निकालें।", "Pull out the weeds that are left by hand.")),
                new("borer", 30, 60, Scouting, T("तना छेदक और पत्ती लपेटक देखें", "Check for stem borer and leaf folder"),
                    T("बीच की पत्ती सूखकर खिंच जाए (डेड हार्ट) या पत्तियां लिपटी हों तो देखें। एक एकड़ में 3–4 फेरोमोन ट्रैप लगाएं। 5% से ज़्यादा पौधे खराब हों तो क्लोरेंट्रानिलिप्रोल 18.5 SC 60 मिली प्रति एकड़ छिड़कें।",
                      "Look for a dried central leaf that pulls out (dead heart) or rolled leaves. Put 3–4 pheromone traps per acre. If more than 5% of plants are hit, spray chlorantraniliprole 18.5 SC, 60 ml per acre.")),
                new("urea2", 45, 50, Fertilizer, T("यूरिया — बाली बनने की शुरुआत", "Urea — at panicle initiation"),
                    T("बची हुई यूरिया डालें। इसके बाद यूरिया न डालें, कीट बढ़ते हैं।",
                      "Put the rest of the urea. No urea after this — it brings more pests."),
                    UreaShare: 0.35),
                new("flowerwater", 70, 85, Irrigation, T("फूल आने पर पानी की कमी न हो", "No water shortage at flowering"),
                    T("बाली निकलते और फूल आते समय खेत में पानी रखें।", "Keep water in the field while panicles come out and flower."),
                    IrrigatedOnly: true),
                new("bph", 75, 95, Scouting, T("भूरा फुदका (BPH) देखें", "Check for brown planthopper"),
                    T("पौधों के नीचे तने पर भूरे कीट दिखें या गोल घेरे में फसल सूखे तो KVK से सलाह लें। खेत का पानी कुछ दिन निकाल दें।",
                      "If brown insects sit at the base of the stems or the crop dries in round patches, ask the KVK. Drain the field for a few days.")),
                new("drain", 95, 100, Irrigation, T("कटाई से पहले पानी निकालें", "Drain before harvest"),
                    T("कटाई से 10–15 दिन पहले खेत से पानी निकाल दें।", "Drain the field 10–15 days before harvest.")),
                new("harvest", 105, 125, Harvest, T("कटाई", "Harvest"),
                    T("जब 80–85% बालियां सुनहरी हो जाएं तब कटाई करें। धान सुखाकर (नमी 14% से कम) बेचें या रखें। पराली न जलाएं।",
                      "Harvest when 80–85% of the panicles are golden. Dry the paddy (below 14% moisture) before selling or storing. Do not burn the straw."))
            }),

        ["chana"] = new("chana", false,
            new[]
            {
                G(0, 25, "अंकुरण", "Germination"), G(26, 50, "शाखाएं बनना", "Branching"),
                G(51, 75, "फूल आना", "Flowering"), G(76, 100, "फली भरना", "Pod filling"), G(101, 120, "पकना", "Ripening")
            },
            new CalendarStep[]
            {
                PrepStep(-7, "खेत की तैयारी", "Prepare the field",
                    "एक गहरी और 2 हल्की जुताई करें। खेत में पानी रुकना नहीं चाहिए।",
                    "One deep and two light ploughings. Water must not stand in the field."),
                new("sow", 0, 0, Sowing, T("चने की बुवाई + बेसल खाद", "Sow chana + basal fertiliser"),
                    T("बीज 25–32 किलो प्रति एकड़, कतार 30 सेमी। बीज को पहले ट्राइकोडर्मा 4 ग्राम प्रति किलो, फिर राइज़ोबियम कल्चर से उपचारित करें। पूरी खाद बुवाई के समय कूंड़ में डालें।",
                      "Seed 25–32 kg per acre, rows 30 cm apart. Treat seed first with Trichoderma 4 g per kg, then with Rhizobium culture. Put all the fertiliser in the furrow at sowing."),
                    UreaShare: 1, Basal: true),
                new("weed", 25, 30, Weeding, T("निराई-गुड़ाई", "Weeding and hoeing"),
                    T("एक निराई-गुड़ाई करें, इससे जड़ों को हवा मिलती है।", "Weed and hoe once; it lets air reach the roots.")),
                new("nip", 30, 40, TaskKind.Prep, T("खुटाई (ऊपरी कलियां तोड़ना)", "Nipping (break the top buds)"),
                    T("पौधों की ऊपरी कलियां तोड़ने से शाखाएं और फलियां ज़्यादा बनती हैं।", "Breaking the top buds gives more branches and more pods.")),
                new("wilt", 30, 60, Scouting, T("उकठा (विल्ट) देखें", "Check for wilt"),
                    T("पौधे मुरझाकर सूखें तो उन्हें उखाड़कर खेत से बाहर नष्ट करें। अगली बार ट्राइकोडर्मा से बीज उपचार ज़रूर करें।",
                      "Pull out wilting, drying plants and destroy them away from the field. Next season always treat seed with Trichoderma.")),
                new("irr1", 40, 45, Irrigation, T("सिंचाई (फूल आने से पहले)", "Irrigation (before flowering)"),
                    T("ज़रूरत हो तो हल्की सिंचाई करें। फूल आते समय सिंचाई न करें, फूल गिरते हैं।",
                      "Give a light irrigation if needed. Do not water while it is flowering — flowers drop."),
                    IrrigatedOnly: true),
                new("podborer", 55, 80, Protection, T("फली छेदक से बचाव", "Protect from pod borer"),
                    T("एक एकड़ में 5 फेरोमोन ट्रैप और चिड़ियों के बैठने के लिए 20 'T' आकार की खूंटियां लगाएं। एक मीटर कतार में 1 से ज़्यादा इल्ली दिखे तो इमामेक्टिन बेंजोएट 5 SG 88 ग्राम प्रति एकड़ छिड़कें।",
                      "Put 5 pheromone traps and 20 T-shaped bird perches per acre. If you see more than 1 caterpillar per metre of row, spray emamectin benzoate 5 SG, 88 g per acre.")),
                new("irr2", 75, 80, Irrigation, T("हल्की सिंचाई (फली बनते समय)", "Light irrigation (pod formation)"),
                    T("मिट्टी बहुत सूखी हो तो हल्का पानी दें।", "Give light water if the soil is very dry."), IrrigatedOnly: true, Optional: true),
                new("harvest", 100, 120, Harvest, T("कटाई", "Harvest"),
                    T("जब पत्तियां पीली होकर झड़ने लगें और फलियां सूख जाएं, तब कटाई करें। दाने को अच्छी तरह सुखाकर भंडार करें।",
                      "Harvest when the leaves turn yellow and drop and the pods are dry. Dry the grain well before storing."))
            }),

        ["mustard"] = new("mustard", false,
            new[]
            {
                G(0, 25, "अंकुरण व बढ़वार", "Germination & growth"), G(26, 50, "शाखाएं", "Branching"),
                G(51, 80, "फूल आना", "Flowering"), G(81, 110, "फली भरना", "Pod filling"), G(111, 140, "पकना", "Ripening")
            },
            new CalendarStep[]
            {
                PrepStep(-7, "खेत की तैयारी", "Prepare the field",
                    "खेत भुरभुरा और समतल बनाएं ताकि छोटा बीज ठीक से जमे।",
                    "Make the soil fine and level so the small seed comes up well."),
                new("sow", 0, 0, Sowing, T("सरसों की बुवाई + बेसल खाद", "Sow mustard + basal fertiliser"),
                    T("बीज 1.5–2 किलो प्रति एकड़, कतार 30–45 सेमी। पूरी DAP, पूरा पोटाश और आधी यूरिया बुवाई पर डालें। तेल बढ़ाने के लिए जिप्सम 40 किलो प्रति एकड़ (सल्फर) डालें।",
                      "Seed 1.5–2 kg per acre, rows 30–45 cm apart. Put all the DAP, all the potash and half the urea at sowing. Add gypsum 40 kg per acre (sulphur) for more oil."),
                    UreaShare: 0.5, Basal: true),
                new("thin", 15, 20, Weeding, T("छंटाई (थिनिंग) व निराई", "Thinning and weeding"),
                    T("पौधे से पौधे की दूरी 10–15 सेमी रखें, फालतू पौधे निकाल दें। साथ में निराई करें।",
                      "Keep 10–15 cm between plants and pull out the extra ones. Weed at the same time.")),
                new("irr1", 30, 35, Irrigation, T("पहली सिंचाई", "1st irrigation"),
                    T("शाखाएं बनते समय पहली सिंचाई करें।", "Give the first irrigation as branches form."), IrrigatedOnly: true),
                new("urea1", 30, 35, Fertilizer, T("बची हुई यूरिया", "Rest of the urea"),
                    T("पहली सिंचाई के बाद बची हुई आधी यूरिया डालें।", "Put the other half of the urea after the first irrigation."),
                    UreaShare: 0.5),
                new("aphid", 45, 80, Scouting, T("माहू (एफिड) देखें", "Check for aphids"),
                    T("फूलों और टहनियों पर कीट के झुंड 10% पौधों पर दिखें तो इमिडाक्लोप्रिड 17.8 SL 40 मिली प्रति एकड़ शाम को छिड़कें (मधुमक्खियां कम होती हैं)।",
                      "If colonies are seen on flowers and shoots of 10% of plants, spray imidacloprid 17.8 SL, 40 ml per acre in the evening (fewer bees then).")),
                new("irr2", 60, 70, Irrigation, T("दूसरी सिंचाई (फली बनते समय)", "2nd irrigation (pod formation)"),
                    T("फली बनते समय पानी देने से दाने भरे-भरे बनते हैं।", "Water at pod formation gives fuller seeds."), IrrigatedOnly: true, Optional: true),
                new("harvest", 110, 140, Harvest, T("कटाई", "Harvest"),
                    T("जब 75% फलियां पीली-भूरी हो जाएं तब सुबह के समय कटाई करें, नहीं तो फलियां चटक कर दाने गिरते हैं।",
                      "Harvest in the morning when 75% of pods turn yellow-brown, otherwise pods burst and seeds fall."))
            }),

        ["soybean"] = new("soybean", false,
            new[]
            {
                G(0, 20, "अंकुरण", "Germination"), G(21, 40, "बढ़वार", "Vegetative growth"),
                G(41, 60, "फूल आना", "Flowering"), G(61, 85, "फली भरना", "Pod filling"), G(86, 110, "पकना", "Maturity")
            },
            new CalendarStep[]
            {
                PrepStep(-7, "खेत की तैयारी", "Prepare the field",
                    "जुताई करें और पानी निकलने के लिए हर 10–12 कतार के बाद नाली बनाएं। कम से कम 4 इंच बारिश के बाद ही बोएं।",
                    "Plough and make a drain channel after every 10–12 rows so water runs off. Sow only after at least 4 inches of rain."),
                new("sow", 0, 0, Sowing, T("सोयाबीन की बुवाई + बेसल खाद", "Sow soybean + basal fertiliser"),
                    T("बीज लगभग 30 किलो प्रति एकड़, कतार 45 सेमी। बीज को थायरम + कार्बेन्डाज़िम (2:1) 3 ग्राम प्रति किलो, फिर राइज़ोबियम और PSB कल्चर से उपचारित करें। पूरी खाद बुवाई पर डालें।",
                      "Seed about 30 kg per acre, rows 45 cm apart. Treat seed with thiram + carbendazim (2:1) 3 g per kg, then with Rhizobium and PSB culture. Put all the fertiliser at sowing."),
                    UreaShare: 1, Basal: true),
                new("weed1", 15, 20, Weeding, T("खरपतवार नियंत्रण", "Weed control"),
                    T("इमाज़ेथापायर 10 SL 400 मिली प्रति एकड़, 150–200 लीटर पानी में छिड़कें, या डोरा/कुल्पा चलाएं।",
                      "Spray imazethapyr 10 SL, 400 ml per acre in 150–200 litres of water, or run a dora/kulpa between rows.")),
                new("girdle", 25, 45, Scouting, T("गर्डल बीटल और तना मक्खी देखें", "Check for girdle beetle and stem fly"),
                    T("तने पर दो गोल कटे निशान वाले या मुरझाए पौधे तोड़कर नष्ट करें।",
                      "Break off and destroy plants that wilt or show two ring cuts on the stem.")),
                new("weed2", 35, 40, Weeding, T("दूसरी निराई", "2nd weeding"),
                    T("ज़रूरत हो तो दूसरी बार निराई करें।", "Weed a second time if needed.")),
                new("leafeater", 40, 65, Protection, T("पत्ती खाने वाली इल्लियों से बचाव", "Protect from leaf-eating caterpillars"),
                    T("सेमीलूपर या तंबाकू इल्ली से पत्तियां ज़्यादा खाई जा रही हों तो क्लोरेंट्रानिलिप्रोल 18.5 SC 60 मिली प्रति एकड़ छिड़कें। पीला मोज़ेक वाले पौधे उखाड़ दें।",
                      "If semilooper or tobacco caterpillars are eating many leaves, spray chlorantraniliprole 18.5 SC, 60 ml per acre. Pull out plants with yellow mosaic.")),
                new("dryspell", 60, 75, Irrigation, T("फली भरते समय सूखा हो तो सिंचाई", "Water at pod filling if it is dry"),
                    T("10–12 दिन बारिश न हो तो एक सिंचाई करें। खेत में पानी रुकने न दें।",
                      "If there is no rain for 10–12 days, give one irrigation. Do not let water stand.")),
                new("harvest", 90, 110, Harvest, T("कटाई", "Harvest"),
                    T("जब ज़्यादातर पत्तियां झड़ जाएं और फलियां भूरी हो जाएं तब कटाई करें। देर करने पर फलियां चटकती हैं।",
                      "Harvest when most leaves have dropped and pods are brown. If you wait too long, pods burst."))
            }),

        ["maize"] = new("maize", false,
            new[]
            {
                G(0, 20, "अंकुरण", "Germination"), G(21, 45, "घुटने तक बढ़वार", "Knee-high growth"),
                G(46, 65, "नर मंजरी व भुट्टा", "Tasselling & silking"), G(66, 90, "दाना भरना", "Grain filling"), G(91, 110, "पकना", "Maturity")
            },
            new CalendarStep[]
            {
                PrepStep(-7, "खेत की तैयारी", "Prepare the field",
                    "गहरी जुताई करें और मेड़-नाली बनाएं ताकि बारिश का पानी निकल जाए।",
                    "Plough deep and make ridges and furrows so rain water drains away."),
                new("sow", 0, 0, Sowing, T("मक्का की बुवाई + बेसल खाद", "Sow maize + basal fertiliser"),
                    T("बीज लगभग 8 किलो प्रति एकड़, कतार 60–75 सेमी, पौधे 20 सेमी। पूरी DAP, पूरा पोटाश और यूरिया का पहला हिस्सा बुवाई पर डालें।",
                      "Seed about 8 kg per acre, rows 60–75 cm, plants 20 cm apart. Put all the DAP, all the potash and the first part of the urea at sowing."),
                    UreaShare: 0.3, Basal: true),
                new("preweed", 0, 2, Weeding, T("खरपतवारनाशी (बुवाई के 2 दिन के अंदर)", "Weedicide (within 2 days of sowing)"),
                    T("एट्राज़िन 50 WP 800 ग्राम प्रति एकड़, 200 लीटर पानी में नम मिट्टी पर छिड़कें।",
                      "Spray atrazine 50 WP, 800 g per acre in 200 litres of water on moist soil.")),
                new("faw", 15, 45, Scouting, T("फॉल आर्मीवर्म देखें", "Check for fall armyworm"),
                    T("गोभ (बीच की पत्तियों) में छेद और बुरादा दिखे तो देखें। 10% से ज़्यादा पौधे खराब हों तो इमामेक्टिन बेंजोएट 5 SG 80 ग्राम प्रति एकड़, गोभ में छिड़कें।",
                      "Look for holes and sawdust-like droppings in the whorl. If more than 10% of plants are hit, spray emamectin benzoate 5 SG, 80 g per acre into the whorls.")),
                new("urea1", 25, 30, Fertilizer, T("यूरिया — घुटने की ऊंचाई पर", "Urea — at knee-high"),
                    T("यूरिया कतारों के पास डालकर मिट्टी चढ़ाएं।", "Put urea beside the rows and earth up the plants."),
                    UreaShare: 0.35),
                new("irr1", 25, 30, Irrigation, T("सिंचाई (घुटने की ऊंचाई)", "Irrigation (knee-high)"),
                    T("बारिश न हो तो पानी दें।", "Water if there is no rain."), IrrigatedOnly: true),
                new("urea2", 45, 50, Fertilizer, T("यूरिया — नर मंजरी से पहले", "Urea — before tasselling"),
                    T("बची हुई यूरिया डालें।", "Put the rest of the urea."), UreaShare: 0.35),
                new("irr2", 50, 60, Irrigation, T("सिंचाई — फूल आने पर (सबसे ज़रूरी)", "Irrigation — at tasselling (most important)"),
                    T("इस समय पानी की कमी से भुट्टे में दाने कम बनते हैं।", "Water shortage now means fewer grains on the cob."), IrrigatedOnly: true),
                new("irr3", 70, 80, Irrigation, T("सिंचाई (दाना भरना)", "Irrigation (grain filling)"),
                    T("बारिश न हो तो पानी दें।", "Water if there is no rain."), IrrigatedOnly: true, Optional: true),
                new("harvest", 90, 110, Harvest, T("कटाई", "Harvest"),
                    T("जब भुट्टे के छिलके सूखकर भूरे हो जाएं और दाने सख्त हों तब तुड़ाई करें। दाने अच्छी तरह सुखाएं।",
                      "Pick when the husks are dry and brown and the grain is hard. Dry the grain well."))
            }),

        ["masoor"] = new("masoor", false,
            new[]
            {
                G(0, 25, "अंकुरण", "Germination"), G(26, 55, "शाखाएं", "Branching"),
                G(56, 80, "फूल आना", "Flowering"), G(81, 110, "फली भरना", "Pod filling"), G(111, 130, "पकना", "Ripening")
            },
            new CalendarStep[]
            {
                PrepStep(-7, "खेत की तैयारी", "Prepare the field",
                    "खेत भुरभुरा और समतल बनाएं।", "Make the soil fine and level."),
                new("sow", 0, 0, Sowing, T("मसूर की बुवाई + बेसल खाद", "Sow masoor + basal fertiliser"),
                    T("बीज लगभग 16 किलो प्रति एकड़, कतार 25–30 सेमी। राइज़ोबियम और PSB कल्चर से बीज उपचार करें। पूरी खाद बुवाई पर डालें।",
                      "Seed about 16 kg per acre, rows 25–30 cm. Treat seed with Rhizobium and PSB culture. Put all the fertiliser at sowing."),
                    UreaShare: 1, Basal: true),
                new("weed", 25, 30, Weeding, T("निराई-गुड़ाई", "Weeding and hoeing"),
                    T("एक बार निराई-गुड़ाई करें।", "Weed and hoe once.")),
                new("irr1", 40, 45, Irrigation, T("सिंचाई (शाखाएं बनते समय)", "Irrigation (branching)"),
                    T("ज़रूरत हो तो हल्की सिंचाई।", "Light irrigation if needed."), IrrigatedOnly: true),
                new("aphid", 50, 75, Scouting, T("माहू और फली छेदक देखें", "Check for aphids and pod borer"),
                    T("कीट ज़्यादा दिखें तो KVK से सलाह लेकर दवा डालें। फेरोमोन ट्रैप लगाएं।",
                      "If pests are many, ask the KVK before spraying. Put pheromone traps.")),
                new("irr2", 70, 75, Irrigation, T("सिंचाई (फली बनते समय)", "Irrigation (pod formation)"),
                    T("मिट्टी सूखी हो तो हल्का पानी दें।", "Give light water if the soil is dry."), IrrigatedOnly: true, Optional: true),
                new("harvest", 110, 130, Harvest, T("कटाई", "Harvest"),
                    T("जब पौधे और फलियां भूरी हो जाएं तब कटाई करें।", "Harvest when the plants and pods turn brown."))
            }),

        ["moong"] = new("moong", false,
            new[]
            {
                G(0, 15, "अंकुरण", "Germination"), G(16, 30, "बढ़वार", "Growth"),
                G(31, 45, "फूल आना", "Flowering"), G(46, 75, "फली व तुड़ाई", "Pods & picking")
            },
            new CalendarStep[]
            {
                PrepStep(-5, "खेत की तैयारी", "Prepare the field",
                    "गेहूं कटने के बाद पलेवा करके जुताई करें।", "After the wheat harvest, give a pre-sowing irrigation and plough."),
                new("sow", 0, 0, Sowing, T("मूंग की बुवाई + बेसल खाद", "Sow moong + basal fertiliser"),
                    T("बीज 8–10 किलो प्रति एकड़, कतार 30 सेमी। राइज़ोबियम कल्चर से बीज उपचार करें। पूरी खाद बुवाई पर डालें।",
                      "Seed 8–10 kg per acre, rows 30 cm. Treat seed with Rhizobium culture. Put all the fertiliser at sowing."),
                    UreaShare: 1, Basal: true),
                new("irr1", 10, 12, Irrigation, T("पहली हल्की सिंचाई", "1st light irrigation"),
                    T("गर्मी में हल्का पानी दें।", "Give light water in the summer heat."), IrrigatedOnly: true),
                new("weed", 20, 25, Weeding, T("निराई", "Weeding"),
                    T("एक निराई करें।", "Weed once.")),
                new("ymv", 20, 45, Scouting, T("सफ़ेद मक्खी और पीला मोज़ेक देखें", "Check for whitefly and yellow mosaic"),
                    T("पीले चितकबरे पत्तों वाले पौधे उखाड़ दें। एक एकड़ में 10 पीले चिपचिपे ट्रैप लगाएं।",
                      "Pull out plants with yellow-mottled leaves. Put 10 yellow sticky traps per acre.")),
                new("irr2", 25, 28, Irrigation, T("दूसरी सिंचाई", "2nd irrigation"),
                    T("हल्का पानी दें।", "Give light water."), IrrigatedOnly: true),
                new("irr3", 40, 45, Irrigation, T("तीसरी सिंचाई (फूल व फली)", "3rd irrigation (flowers & pods)"),
                    T("फूल आते समय मिट्टी में नमी रहे।", "Keep the soil moist at flowering."), IrrigatedOnly: true),
                new("harvest", 55, 75, Harvest, T("फलियों की तुड़ाई", "Pick the pods"),
                    T("काली पड़ी फलियां 2–3 बार में तोड़ें। आखिर में पौधे खेत में जोत दें, मिट्टी को नाइट्रोजन मिलता है।",
                      "Pick black pods in 2–3 rounds. At the end plough the plants into the soil — it adds nitrogen."))
            })
    };
}
