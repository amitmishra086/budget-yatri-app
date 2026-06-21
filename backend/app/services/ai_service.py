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
