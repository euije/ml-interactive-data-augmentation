import requests
from bs4 import BeautifulSoup
import json


def fetch_titles(url: str) -> list[str]:
    """
    Fetch all paper titles from the given DBLP conference page.

    Args:
        url: URL of the DBLP conference page
    Returns:
        A list of title strings
    """
    # Fetch the HTML content
    response = requests.get(url)
    response.raise_for_status()

    # Parse with BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all <span class="title"> elements
    spans = soup.find_all('span', class_='title')
    titles = [span.get_text(strip=True) for span in spans]
    return titles


def save_titles_to_json(titles: list[str], filename: str) -> None:
    """
    Save the titles list to a JSON file in the specified format.

    Args:
        titles: List of paper title strings
        filename: Output JSON filename
    """
    data = {
        "contents": [
            {"title": title} for title in titles
        ]
    }
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    DBLP_URL = 'https://dblp.org/db/conf/chi/chi2025.html'
    OUTPUT_FILE = 'chi2025_papers.json'

    titles = fetch_titles(DBLP_URL)
    save_titles_to_json(titles, OUTPUT_FILE)
    print(f"Fetched {len(titles)} titles. Saved to {OUTPUT_FILE}.")
