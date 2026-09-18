"""
AI Travel Assistant Service.

Right now this uses a TEMPLATE/MOCK engine (no API key needed) so the app
works out of the box. Once you have an Anthropic API key, just:

1. Add ANTHROPIC_API_KEY to your .env file
2. This module will automatically detect the key and switch to real
   Claude-powered responses (see `_call_claude` below).

No other code needs to change - routers call `get_travel_suggestion()`
and `chat_with_assistant()` regardless of which engine is active.
"""
import os
import json
import random
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
USE_REAL_AI = bool(ANTHROPIC_API_KEY)

# ---------------------------------------------------------------------------
# MOCK DATA - used when no API key is configured.
# Add more destinations here anytime to expand offline coverage.
# ---------------------------------------------------------------------------
MOCK_DESTINATIONS = {
    "goa": {
        "famous_for": "Beaches, nightlife, Portuguese architecture, seafood",
        "places": ["Baga Beach", "Fort Aguada", "Anjuna Flea Market", "Dudhsagar Falls", "Old Goa Churches"],
        "food": ["Goan Fish Curry", "Bebinca", "Prawn Balchao", "Pork Vindaloo"],
        "budget_hotels": ["Zostel Goa", "The Hosteller Goa", "Backpacker Panda"],
        "budget_tip": "Travel by rented scooty (₹300-400/day) instead of cabs. Eat at local shacks instead of beach-side resorts to save 50-60%.",
        "avg_daily_budget_low": 1500,
        "avg_daily_budget_mid": 3500,
    },
    "manali": {
        "famous_for": "Snow mountains, adventure sports, Old Manali cafes",
        "places": ["Solang Valley", "Hadimba Temple", "Old Manali", "Rohtang Pass", "Jogini Falls"],
        "food": ["Siddu", "Trout Fish", "Thukpa", "Momos"],
        "budget_hotels": ["Zostel Manali", "Hosteller Old Manali", "Local guesthouses"],
        "budget_tip": "Stay in Old Manali instead of Mall Road - guesthouses are 40% cheaper. Shared taxis to Solang Valley save a lot vs private cabs.",
        "avg_daily_budget_low": 1200,
        "avg_daily_budget_mid": 3000,
    },
    "jaipur": {
        "famous_for": "Forts, palaces, Rajasthani culture, bazaars",
        "places": ["Amber Fort", "Hawa Mahal", "City Palace", "Jal Mahal", "Nahargarh Fort"],
        "food": ["Dal Baati Churma", "Pyaaz Kachori", "Ghewar", "Laal Maas"],
        "budget_hotels": ["Zostel Jaipur", "Moustache Jaipur", "Madpackers Hostel"],
        "budget_tip": "Buy a composite ticket for monuments to save money. Use app-based autos (cheaper than negotiating). Eat at local dhabas in the walled city.",
        "avg_daily_budget_low": 1000,
        "avg_daily_budget_mid": 2500,
    },
    "rishikesh": {
        "famous_for": "Yoga, river rafting, spirituality, Ganga Aarti",
        "places": ["Laxman Jhula", "Triveni Ghat", "Beatles Ashram", "Neer Garh Waterfall", "Ram Jhula"],
        "food": ["Sattvic thalis", "Aloo Puri", "Local Ashram food (often free/donation)"],
        "budget_hotels": ["Zostel Rishikesh", "Backpacker hostels near Laxman Jhula"],
        "budget_tip": "Stay in shared dorms near Tapovan. Many ashrams offer free/cheap meals. Rafting is cheaper if booked directly at the riverside, not through hotels.",
        "avg_daily_budget_low": 900,
        "avg_daily_budget_mid": 2200,
    },
    "hampi": {
        "famous_for": "Ancient ruins, boulder landscapes, Vijayanagara Empire history",
        "places": ["Virupaksha Temple", "Vittala Temple", "Matanga Hill Sunrise Point", "Hampi Bazaar", "Anegundi Village"],
        "food": ["South Indian Thali", "Banana chips", "Filter coffee"],
        "budget_hotels": ["The Hampi Boulders", "Goan Corner Hostel", "Local guesthouses in Hampi Bazaar"],
        "budget_tip": "Rent a bicycle (₹100/day) instead of an auto to explore ruins spread across the village. Cross the river coracle instead of the long road route to save time and money.",
        "avg_daily_budget_low": 800,
        "avg_daily_budget_mid": 2000,
    },
    "pondicherry": {
        "famous_for": "French Quarter, Auroville, beachside cafes",
        "places": ["Promenade Beach", "French Quarter", "Auroville", "Paradise Beach", "Sri Aurobindo Ashram"],
        "food": ["French-Tamil fusion food", "Croissants at local bakeries", "Filter coffee"],
        "budget_hotels": ["Zostel Pondicherry", "Vinayak Star Lodge", "Budget lodges in Anna Nagar"],
        "budget_tip": "Rent a bicycle to explore the walkable French Quarter for free. Skip Paradise Beach boat ride on weekends when it's overpriced — go on weekdays.",
        "avg_daily_budget_low": 1100,
        "avg_daily_budget_mid": 2600,
    },
    "puducherry": {
        "famous_for": "French Quarter, Auroville, beachside cafes",
        "places": ["Promenade Beach", "French Quarter", "Auroville", "Paradise Beach", "Sri Aurobindo Ashram"],
        "food": ["French-Tamil fusion food", "Croissants at local bakeries", "Filter coffee"],
        "budget_hotels": ["Zostel Pondicherry", "Vinayak Star Lodge", "Budget lodges in Anna Nagar"],
        "budget_tip": "Rent a bicycle to explore the walkable French Quarter for free. Skip Paradise Beach boat ride on weekends when it's overpriced — go on weekdays.",
        "avg_daily_budget_low": 1100,
        "avg_daily_budget_mid": 2600,
    },
    "udaipur": {
        "famous_for": "City of Lakes, royal palaces, Rajasthani heritage",
        "places": ["City Palace", "Lake Pichola", "Jag Mandir", "Saheliyon Ki Bari", "Fateh Sagar Lake"],
        "food": ["Dal Baati Churma", "Laal Maas", "Mirchi Bada", "Rajasthani Thali"],
        "budget_hotels": ["Zostel Udaipur", "Hostel Puppet", "Lakeside budget guesthouses"],
        "budget_tip": "Watch the sunset from a rooftop cafe instead of a paid boat ride for similar lake views at a fraction of the cost. Old City guesthouses are much cheaper than lakefront hotels.",
        "avg_daily_budget_low": 1300,
        "avg_daily_budget_mid": 3200,
    },
    "mcleodganj": {
        "famous_for": "Tibetan culture, Himalayan views, monasteries",
        "places": ["Bhagsu Waterfall", "Namgyal Monastery", "Triund Trek", "Dal Lake", "Tibet Museum"],
        "food": ["Thukpa", "Tibetan Momos", "Butter Tea"],
        "budget_hotels": ["Zostel Mcleodganj", "Nickies Nook budget rooms", "Guesthouses near Bhagsu Road"],
        "budget_tip": "The Triund trek is free and one of the best views around — pack your own snacks/water. Tibetan cafes are much cheaper than restaurants on the main square.",
        "avg_daily_budget_low": 900,
        "avg_daily_budget_mid": 2300,
    },
    "varanasi": {
        "famous_for": "Ganga Aarti, ancient ghats, spirituality, temples",
        "places": ["Dashashwamedh Ghat", "Kashi Vishwanath Temple", "Assi Ghat", "Sarnath", "Manikarnika Ghat"],
        "food": ["Kachori Sabzi", "Banarasi Paan", "Malaiyo", "Thandai"],
        "budget_hotels": ["Zostel Varanasi", "Stops Hostel", "Guesthouses near Assi Ghat"],
        "budget_tip": "Walk the ghats at sunrise for free instead of paying for a boat — or split a shared boat ride with other travellers to cut the cost. Street food near Assi Ghat is cheap and excellent.",
        "avg_daily_budget_low": 700,
        "avg_daily_budget_mid": 1800,
    },
    "coorg": {
        "famous_for": "Coffee plantations, misty hills, waterfalls",
        "places": ["Abbey Falls", "Raja's Seat", "Dubare Elephant Camp", "Talakaveri", "Namdroling Monastery"],
        "food": ["Pandi Curry", "Akki Roti", "Kadambuttu", "Coorg filter coffee"],
        "budget_hotels": ["Coorg backpacker hostels", "Homestays in Madikeri", "Budget plantation stays"],
        "budget_tip": "Book a homestay instead of a resort — cheaper and includes home-cooked meals. Shared jeep tours to viewpoints cost far less than private cabs.",
        "avg_daily_budget_low": 1400,
        "avg_daily_budget_mid": 3200,
    },
    "spiti": {
        "famous_for": "Cold desert landscapes, monasteries, high-altitude villages",
        "places": ["Key Monastery", "Chandratal Lake", "Kaza", "Pin Valley", "Langza Village"],
        "food": ["Thukpa", "Momos", "Local barley dishes"],
        "budget_hotels": ["Homestays in Kaza", "Monastery guesthouses", "Budget camps near Chandratal"],
        "budget_tip": "Homestays are the cheapest and most authentic way to sleep here — often under ₹500/night with meals. Share a shared taxi/bus from Manali/Shimla instead of hiring a private vehicle.",
        "avg_daily_budget_low": 1000,
        "avg_daily_budget_mid": 2500,
    },
    "munnar": {
        "famous_for": "Tea gardens, rolling hills, cool weather",
        "places": ["Tea Museum", "Eravikulam National Park", "Mattupetty Dam", "Top Station", "Echo Point"],
        "food": ["Kerala Sadya", "Appam with stew", "Kerala filter coffee"],
        "budget_hotels": ["Zostel Munnar", "Budget homestays near tea estates", "YMCA guesthouses"],
        "budget_tip": "Share a jeep/taxi with other travellers for the hill circuit instead of a private vehicle. Tea estate viewpoints along the road are free — you don't need to pay for every entry.",
        "avg_daily_budget_low": 1200,
        "avg_daily_budget_mid": 2800,
    },
    "leh": {
        "famous_for": "High-altitude passes, monasteries, Pangong Lake, biking trips",
        "places": ["Pangong Lake", "Nubra Valley", "Khardung La", "Leh Palace", "Magnetic Hill"],
        "food": ["Thukpa", "Skyu", "Butter Tea", "Momos"],
        "budget_hotels": ["Zostel Leh", "Budget guesthouses in Leh Market", "Monastery-run homestays"],
        "budget_tip": "Rent a Royal Enfield with a group to split fuel costs across Ladakh's long distances. Acclimatize for 2 days before sightseeing to avoid wasted, unwell travel days.",
        "avg_daily_budget_low": 1500,
        "avg_daily_budget_mid": 3500,
    },
    "ladakh": {
        "famous_for": "High-altitude passes, monasteries, Pangong Lake, biking trips",
        "places": ["Pangong Lake", "Nubra Valley", "Khardung La", "Leh Palace", "Magnetic Hill"],
        "food": ["Thukpa", "Skyu", "Butter Tea", "Momos"],
        "budget_hotels": ["Zostel Leh", "Budget guesthouses in Leh Market", "Monastery-run homestays"],
        "budget_tip": "Rent a Royal Enfield with a group to split fuel costs across Ladakh's long distances. Acclimatize for 2 days before sightseeing to avoid wasted, unwell travel days.",
        "avg_daily_budget_low": 1500,
        "avg_daily_budget_mid": 3500,
    },
    "alleppey": {
        "famous_for": "Kerala backwaters, houseboats, coconut lagoons",
        "places": ["Alleppey Backwaters", "Alappuzha Beach", "Kumarakom Bird Sanctuary", "Marari Beach", "Punnamada Lake"],
        "food": ["Kerala Sadya", "Karimeen Fish Fry", "Appam with stew"],
        "budget_hotels": ["Shared/budget houseboats (split cost with a group)", "Homestays near Alleppey town"],
        "budget_tip": "A private houseboat is expensive — share one with a group of travellers to cut the per-person cost dramatically, or take a shared shikara ride instead for a few hours on the water.",
        "avg_daily_budget_low": 1300,
        "avg_daily_budget_mid": 3000,
    },
    "amritsar": {
        "famous_for": "Golden Temple, Wagah Border, Punjabi food culture",
        "places": ["Golden Temple", "Wagah Border Ceremony", "Jallianwala Bagh", "Partition Museum", "Gobindgarh Fort"],
        "food": ["Amritsari Kulcha", "Langar at Golden Temple (free)", "Lassi", "Chole Bhature"],
        "budget_hotels": ["Free Golden Temple dormitories (donation-based)", "Budget hotels near Hall Bazaar"],
        "budget_tip": "The Golden Temple offers free community meals (langar) and simple free/donation-based stays — a huge saver. Walk between most major sights; they're close together.",
        "avg_daily_budget_low": 700,
        "avg_daily_budget_mid": 1800,
    },
    "gokarna": {
        "famous_for": "Quiet beaches, cliffside treks, laid-back vibe",
        "places": ["Om Beach", "Kudle Beach", "Half Moon Beach", "Mahabaleshwar Temple", "Paradise Beach"],
        "food": ["Beach shack seafood", "South Indian Thali", "Fresh fruit bowls"],
        "budget_hotels": ["Beach hut stays on Kudle/Om Beach", "Budget hostels in Gokarna town"],
        "budget_tip": "Beach huts are far cheaper than hotels and put you right on the sand. Walk the cliffside trail between beaches instead of paying for a boat or auto.",
        "avg_daily_budget_low": 900,
        "avg_daily_budget_mid": 2100,
    },
}

DEFAULT_DESTINATION_TEMPLATE = {
    "famous_for": "Local culture, food, and scenic spots",
    "places": ["City center / Old town", "Main local market", "Nearby viewpoint or fort/temple", "Local museum"],
    "food": ["Regional thali", "Local street food specialties", "Famous local sweet"],
    "budget_hotels": ["Look for hostels on Zostel/Hosteller/Goibibo filtered under ₹800/night", "Local guesthouses near bus/train station"],
    "budget_tip": "Travel by local buses/trains, eat at places where locals eat (not near tourist spots), and book hostels over hotels for solo/group budget trips.",
    "avg_daily_budget_low": 1200,
    "avg_daily_budget_mid": 3000,
}


def _get_destination_data(destination: str) -> dict:
    key = destination.strip().lower()
    return MOCK_DESTINATIONS.get(key, DEFAULT_DESTINATION_TEMPLATE)


def get_travel_suggestion(destination: str, days: int, budget_total: float, travelers: int = 1) -> dict:
    """
    Generates a day-wise itinerary + suggestions for a trip.
    Returns a dict that gets stored as JSON in trip.itinerary_json.
    """
    if USE_REAL_AI:
        return _call_claude_for_itinerary(destination, days, budget_total, travelers)

    data = _get_destination_data(destination)
    per_day_budget = round(budget_total / max(days, 1), 2)
    is_tight = per_day_budget < data["avg_daily_budget_mid"]

    day_plan = []
    places_pool = data["places"]
    for d in range(1, days + 1):
        place = places_pool[(d - 1) % len(places_pool)]
        day_plan.append({
            "day": d,
            "suggested_activity": f"Explore {place}",
            "food_suggestion": random.choice(data["food"]),
        })

    return {
        "destination": destination.title(),
        "famous_for": data["famous_for"],
        "must_visit_places": data["places"],
        "must_try_food": data["food"],
        "budget_hotel_suggestions": data["budget_hotels"],
        "day_wise_plan": day_plan,
        "per_day_budget": per_day_budget,
        "budget_status": "tight - follow budget tips closely" if is_tight else "comfortable",
        "money_saving_tip": data["budget_tip"],
        "source": "template_engine",
    }


def chat_with_assistant(message: str, chat_history: list[dict] | None = None) -> str:
    """
    Handles free-form chat messages like "Goa me 5000 me kya karu".
    chat_history: list of {"role": "user"/"assistant", "content": "..."}
    """
    if USE_REAL_AI:
        return _call_claude_for_chat(message, chat_history or [])

    return _mock_chat_reply(message)


def _mock_chat_reply(message: str) -> str:
    """Simple keyword-based mock reply engine (no API key needed)."""
    msg = message.lower()

    found_dest = None
    for dest_key in MOCK_DESTINATIONS:
        if dest_key in msg:
            found_dest = dest_key
            break

    if found_dest:
        data = MOCK_DESTINATIONS[found_dest]
        return (
            f"{found_dest.title()} is famous for {data['famous_for']}.\n\n"
            f"Must visit: {', '.join(data['places'][:3])}.\n"
            f"Must try food: {', '.join(data['food'][:3])}.\n"
            f"Budget stay options: {', '.join(data['budget_hotels'][:2])}.\n\n"
            f"💡 Money-saving tip: {data['budget_tip']}\n\n"
            f"(This is a template-based reply. Add your Anthropic API key in .env "
            f"for smarter, more personalized AI answers!)"
        )

    return (
        "I can help you plan a budget trip! Try asking about a specific place, "
        "e.g. 'Goa me 5000 me kya karu' or 'best budget hotels in Manali'.\n\n"
        "Currently running on template/demo mode. Add ANTHROPIC_API_KEY in your "
        ".env file to unlock full AI-powered answers for any destination."
    )


# ---------------------------------------------------------------------------
# REAL AI INTEGRATION (activates automatically once ANTHROPIC_API_KEY is set)
# ---------------------------------------------------------------------------
def _call_claude_for_itinerary(destination: str, days: int, budget_total: float, travelers: int) -> dict:
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    prompt = f"""You are a budget travel planning assistant for Indian travellers.
Create a {days}-day trip plan for {destination} with a total budget of ₹{budget_total} for {travelers} traveler(s).

Respond ONLY with valid JSON (no markdown, no preamble) in this exact shape:
{{
  "destination": "...",
  "famous_for": "...",
  "must_visit_places": ["...", "..."],
  "must_try_food": ["...", "..."],
  "budget_hotel_suggestions": ["...", "..."],
  "day_wise_plan": [{{"day": 1, "suggested_activity": "...", "food_suggestion": "..."}}],
  "per_day_budget": 0,
  "budget_status": "tight" or "comfortable",
  "money_saving_tip": "..."
}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    text = response.content[0].text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(text)
        result["source"] = "claude_ai"
        return result
    except json.JSONDecodeError:
        # Fallback to template engine if AI doesn't return clean JSON
        return get_travel_suggestion.__wrapped__(destination, days, budget_total, travelers) \
            if hasattr(get_travel_suggestion, "__wrapped__") else _get_destination_data(destination)


def _call_claude_for_chat(message: str, chat_history: list[dict]) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    system_prompt = (
        "You are a friendly, knowledgeable budget travel assistant for Indian travellers. "
        "Give practical, specific suggestions about places to visit, food to try, budget "
        "hotels/hostels, and money-saving tips. Keep answers concise and actionable. "
        "Use ₹ for currency."
    )

    messages = chat_history + [{"role": "user", "content": message}]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=600,
        system=system_prompt,
        messages=messages,
    )
    return response.content[0].text.strip()
