Training Recommendations (New Core API)

Single-file integration: Node.js calls a Python CLI (tga_bridge.py) in the background to communicate with the TGA SOAP.

ANZSCO code (4-6 digits): First search for courses by ANZSCO, then retrieve usage recommendations for each one. If no courses are found, a list of the top N courses and official links to details will be returned.

TGA course code (non-numeric, such as CHC42121): Directly retrieve usage recommendations for the course.

GET /training-advice/:code?limit=5

code: ANZSCO (e.g., 411711) or TGA code (e.g., CHC42121)

limit: Maximum number of "recommended" courses to return. Defaults to 5 (this value is also used as a fallback to select the top N).

Example 1: ANZSCO

curl "http://localhost:8080/training-advice/411711?limit=5"

Possible response (with recommendations):

{
"anzsco": "411711",
"found": 2,
"items": [
{
"tgaCode": "CHC42121",
"title": "Certificate IV in Community Development",
"componentType": ["Qualification"],
"advice": [
{ "type": "Text", "text": "...", "source": "TGA", "url": "..." }
]
}
]
}

Possible response (no recommendation → fallback):

{
"anzsco": "411711",
"found": 0,
"items": [
{
"tgaCode": "CHC42121",
"title": "Certificate IV in Community Development",
"componentType": ["Qualification"],
"advice": null,
"link": "https://training.gov.au/Training/Details/CHC42121"
}
],
"note": "No Usage Recommendations in TGA; returned top matches with detail links."
}

Example 2: TGA course code

curl "http://localhost:8080/training-advice/CHC42121"

Response:

{
"input": "CHC42121",
"type": "TGA",
"count": 0,
"items": []
}
