"""LSD recommendations (EN / HI / PA). General guidance only - not a diagnosis."""
from fastapi import APIRouter, Query

router = APIRouter()

ADVICE = {
    "en": {
        "high_title": "Possible Lumpy Skin Disease - act now",
        "low_title": "No lumpy skin signs detected",
        "high": [
            "Separate this animal from the herd immediately (keep it in a shaded, well-ventilated spot).",
            "Call your local veterinarian or the Animal Husbandry Department as soon as possible - LSD must be confirmed by a vet or lab test.",
            "Do not move, sell or mix animals from this herd until a vet says it is safe.",
            "Control flies, mosquitoes and ticks (they spread the virus): clean sheds, remove standing water, use vet-approved repellents.",
            "Give clean water and soft, easy-to-eat feed; keep the animal comfortable.",
            "Wear gloves, wash hands, and disinfect equipment, sheds and feeding troughs after handling the animal.",
            "Do not give any medicine on your own - treatment of fever, wounds and secondary infection must be directed by a vet.",
            "Ask your vet about vaccinating the healthy animals in the herd.",
        ],
        "low": [
            "The photo does not show typical lumpy skin signs, but this tool is a screening aid, not a diagnosis.",
            "Keep checking the animal for fever, loss of appetite, nodules/lumps on skin, swollen lymph nodes or reduced milk.",
            "Keep sheds clean and control flies, mosquitoes and ticks.",
            "Keep new animals separate for 2-3 weeks before mixing them with the herd.",
            "Ask your vet about LSD vaccination, especially if cases are reported nearby.",
            "If any lumps or fever appear, contact a veterinarian immediately.",
        ],
        "disclaimer": "ALSD-AI is a screening tool. Final diagnosis and treatment must be done by a qualified veterinarian.",
    },
    "hi": {
        "high_title": "लंपी स्किन डिजीज़ की संभावना - तुरंत कदम उठाएँ",
        "low_title": "लंपी स्किन के लक्षण नहीं मिले",
        "high": [
            "इस पशु को तुरंत झुंड से अलग करें (छायादार और हवादार जगह पर रखें)।",
            "जल्द से जल्द अपने नज़दीकी पशु चिकित्सक या पशुपालन विभाग से संपर्क करें - LSD की पुष्टि डॉक्टर या लैब टेस्ट से ही होती है।",
            "जब तक डॉक्टर अनुमति न दे, इस झुंड के पशुओं को न बेचें, न इधर-उधर ले जाएँ और न मिलाएँ।",
            "मक्खी, मच्छर और किलनी (टिक) पर नियंत्रण रखें क्योंकि ये वायरस फैलाते हैं: बाड़ा साफ रखें, रुका हुआ पानी हटाएँ, डॉक्टर द्वारा बताए गए रिपेलेंट का उपयोग करें।",
            "साफ पानी और नरम, आसानी से खाने वाला चारा दें; पशु को आराम से रखें।",
            "पशु को छूने के बाद दस्ताने पहनें, हाथ धोएँ और बाड़े, बर्तनों व उपकरणों को कीटाणुरहित करें।",
            "खुद से कोई दवा न दें - बुखार, घाव और संक्रमण का इलाज पशु चिकित्सक की सलाह से ही करें।",
            "झुंड के स्वस्थ पशुओं के टीकाकरण के बारे में डॉक्टर से पूछें।",
        ],
        "low": [
            "फोटो में लंपी स्किन के सामान्य लक्षण नहीं दिखे, लेकिन यह टूल केवल प्रारंभिक जाँच है, अंतिम निदान नहीं।",
            "बुखार, भूख कम होना, त्वचा पर गाँठें, गिल्टियों में सूजन या दूध कम होने पर नज़र रखें।",
            "बाड़ा साफ रखें और मक्खी, मच्छर व किलनी पर नियंत्रण रखें।",
            "नए पशु को झुंड में मिलाने से पहले 2-3 सप्ताह अलग रखें।",
            "खासकर आसपास मामले मिलने पर LSD के टीके के बारे में डॉक्टर से पूछें।",
            "गाँठें या बुखार दिखे तो तुरंत पशु चिकित्सक से संपर्क करें।",
        ],
        "disclaimer": "ALSD-AI केवल प्रारंभिक जाँच का टूल है। अंतिम निदान और इलाज योग्य पशु चिकित्सक ही करें।",
    },
    "pa": {
        "high_title": "ਲੰਪੀ ਸਕਿਨ ਬਿਮਾਰੀ ਦੀ ਸੰਭਾਵਨਾ - ਤੁਰੰਤ ਕਦਮ ਚੁੱਕੋ",
        "low_title": "ਲੰਪੀ ਸਕਿਨ ਦੇ ਲੱਛਣ ਨਹੀਂ ਮਿਲੇ",
        "high": [
            "ਇਸ ਪਸ਼ੂ ਨੂੰ ਤੁਰੰਤ ਝੁੰਡ ਤੋਂ ਅਲੱਗ ਕਰੋ (ਛਾਂਦਾਰ ਅਤੇ ਹਵਾਦਾਰ ਥਾਂ 'ਤੇ ਰੱਖੋ)।",
            "ਜਲਦੀ ਤੋਂ ਜਲਦੀ ਆਪਣੇ ਨੇੜਲੇ ਪਸ਼ੂ ਡਾਕਟਰ ਜਾਂ ਪਸ਼ੂ ਪਾਲਣ ਵਿਭਾਗ ਨਾਲ ਸੰਪਰਕ ਕਰੋ - LSD ਦੀ ਪੁਸ਼ਟੀ ਡਾਕਟਰ ਜਾਂ ਲੈਬ ਟੈਸਟ ਨਾਲ ਹੀ ਹੁੰਦੀ ਹੈ।",
            "ਜਦੋਂ ਤੱਕ ਡਾਕਟਰ ਇਜਾਜ਼ਤ ਨਾ ਦੇਵੇ, ਇਸ ਝੁੰਡ ਦੇ ਪਸ਼ੂ ਨਾ ਵੇਚੋ, ਨਾ ਇੱਧਰ-ਉੱਧਰ ਲੈ ਜਾਓ ਅਤੇ ਨਾ ਹੀ ਹੋਰਾਂ ਨਾਲ ਮਿਲਾਓ।",
            "ਮੱਖੀਆਂ, ਮੱਛਰ ਅਤੇ ਚਿੱਚੜ (ਟਿੱਕ) ਨੂੰ ਕਾਬੂ ਕਰੋ ਕਿਉਂਕਿ ਇਹ ਵਾਇਰਸ ਫੈਲਾਉਂਦੇ ਹਨ: ਵਾੜਾ ਸਾਫ਼ ਰੱਖੋ, ਖੜ੍ਹਾ ਪਾਣੀ ਹਟਾਓ, ਡਾਕਟਰ ਵੱਲੋਂ ਦੱਸੇ ਰਿਪੈਲੈਂਟ ਵਰਤੋ।",
            "ਸਾਫ਼ ਪਾਣੀ ਅਤੇ ਨਰਮ, ਆਸਾਨੀ ਨਾਲ ਖਾਣ ਵਾਲਾ ਚਾਰਾ ਦਿਓ; ਪਸ਼ੂ ਨੂੰ ਆਰਾਮ ਨਾਲ ਰੱਖੋ।",
            "ਪਸ਼ੂ ਨੂੰ ਛੂਹਣ ਤੋਂ ਬਾਅਦ ਦਸਤਾਨੇ ਪਾਓ, ਹੱਥ ਧੋਵੋ ਅਤੇ ਵਾੜੇ, ਬਰਤਨਾਂ ਤੇ ਸਾਮਾਨ ਨੂੰ ਕੀਟਾਣੂ-ਰਹਿਤ ਕਰੋ।",
            "ਆਪਣੇ ਆਪ ਕੋਈ ਦਵਾਈ ਨਾ ਦਿਓ - ਬੁਖਾਰ, ਜ਼ਖ਼ਮ ਅਤੇ ਇਨਫੈਕਸ਼ਨ ਦਾ ਇਲਾਜ ਪਸ਼ੂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਨਾਲ ਹੀ ਕਰੋ।",
            "ਝੁੰਡ ਦੇ ਤੰਦਰੁਸਤ ਪਸ਼ੂਆਂ ਦੇ ਟੀਕਾਕਰਨ ਬਾਰੇ ਡਾਕਟਰ ਤੋਂ ਪੁੱਛੋ।",
        ],
        "low": [
            "ਫੋਟੋ ਵਿੱਚ ਲੰਪੀ ਸਕਿਨ ਦੇ ਆਮ ਲੱਛਣ ਨਹੀਂ ਦਿੱਸੇ, ਪਰ ਇਹ ਟੂਲ ਸਿਰਫ਼ ਮੁੱਢਲੀ ਜਾਂਚ ਹੈ, ਅੰਤਿਮ ਨਿਦਾਨ ਨਹੀਂ।",
            "ਬੁਖਾਰ, ਭੁੱਖ ਘਟਣਾ, ਚਮੜੀ 'ਤੇ ਗੰਢਾਂ, ਗਿਲਟੀਆਂ ਦੀ ਸੋਜ ਜਾਂ ਦੁੱਧ ਘਟਣ 'ਤੇ ਨਜ਼ਰ ਰੱਖੋ।",
            "ਵਾੜਾ ਸਾਫ਼ ਰੱਖੋ ਅਤੇ ਮੱਖੀਆਂ, ਮੱਛਰ ਤੇ ਚਿੱਚੜ ਨੂੰ ਕਾਬੂ ਕਰੋ।",
            "ਨਵੇਂ ਪਸ਼ੂ ਨੂੰ ਝੁੰਡ ਵਿੱਚ ਮਿਲਾਉਣ ਤੋਂ ਪਹਿਲਾਂ 2-3 ਹਫ਼ਤੇ ਅਲੱਗ ਰੱਖੋ।",
            "ਖ਼ਾਸ ਕਰਕੇ ਨੇੜੇ ਕੇਸ ਮਿਲਣ 'ਤੇ LSD ਦੇ ਟੀਕੇ ਬਾਰੇ ਡਾਕਟਰ ਤੋਂ ਪੁੱਛੋ।",
            "ਗੰਢਾਂ ਜਾਂ ਬੁਖਾਰ ਦਿੱਸੇ ਤਾਂ ਤੁਰੰਤ ਪਸ਼ੂ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।",
        ],
        "disclaimer": "ALSD-AI ਸਿਰਫ਼ ਮੁੱਢਲੀ ਜਾਂਚ ਦਾ ਟੂਲ ਹੈ। ਅੰਤਿਮ ਨਿਦਾਨ ਅਤੇ ਇਲਾਜ ਯੋਗ ਪਸ਼ੂ ਡਾਕਟਰ ਹੀ ਕਰੇ।",
    },
}


def build_advice(health_class: str, lang: str = "en") -> dict:
    lang = lang if lang in ADVICE else "en"
    data = ADVICE[lang]
    is_lsd = "lumpy" in (health_class or "").lower()
    level = "high" if is_lsd else "low"
    return {
        "level": level,
        "title": data[f"{level}_title"],
        "steps": data[level],
        "disclaimer": data["disclaimer"],
        "lang": lang,
    }


@router.get("/advice")
def advice(health_class: str = Query(..., description="e.g. 'Lumpy Skin' or 'Normal Skin'"),
           lang: str = Query("en")):
    return build_advice(health_class, lang)
