# tga_bridge.py
# 依赖：zeep, requests
# 用法：
#   python tga_bridge.py search 411711
#   python tga_bridge.py advice CHC42121

import sys
import json
import os
from typing import Dict, Any, List
from requests import Session
from zeep import Client
from zeep.transports import Transport
from zeep.helpers import serialize_object
from zeep.wsse.username import UsernameToken

TGA_BASE = os.getenv("TGA_BASE", "https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices")
WSDL_TCS = os.getenv("TGA_WSDL", f"{TGA_BASE}/TrainingComponentService.svc?singleWsdl")
TGA_USER = os.getenv("TGA_USER", "WebService.Read")
TGA_PASS = os.getenv("TGA_PASS", "Asdf098")
ANZSCO_SCHEME = "01"


def make_client(timeout: int = 60) -> Client:
    session = Session()
    transport = Transport(session=session, timeout=timeout)
    client = Client(WSDL_TCS, transport=transport)
    client.wsse = UsernameToken(TGA_USER, TGA_PASS, use_digest=False)
    return client


def search_by_anzsco(anzsco_code: str) -> Dict[str, Any]:
    client = make_client()
    ReqType = client.get_type("{http://training.gov.au/services/}TrainingComponentSearchRequest")
    ArrayOfString = client.get_type("{http://schemas.microsoft.com/2003/10/Serialization/Arrays}ArrayOfstring")

    filters = {
        "ClassificationFilter": [
            {"Scheme": ANZSCO_SCHEME, "Values": ArrayOfString([anzsco_code])}
        ]
    }
    req = ReqType(PageNumber=1, PageSize=200, ClassificationFilters=filters)
    resp = client.service.Search(req)

    count = int(getattr(resp, "Count", 0) or 0)
    results = getattr(resp, "Results", None)
    summaries = getattr(results, "TrainingComponentSummary", None) if results else None

    items = []
    if summaries:
        if not isinstance(summaries, list):
            summaries = [summaries]
        for s in summaries:
            d = serialize_object(s) or {}
            items.append({
                "code": d.get("Code"),
                "title": d.get("Title"),
                "componentType": d.get("ComponentType"),
                "status": d.get("Status"),
                "nominalHours": d.get("NominalHours"),
            })
    return {"anzsco": anzsco_code, "count": count, "items": items}


def get_training_advice_by_tga_code(tga_code: str) -> Dict[str, Any]:
    client = make_client()
    info = {
        "IncludeContacts": False,
        "IncludeReleases": False,
        "IncludeCurrencyPeriods": False,
        "IncludeClassifications": False,
        "IncludeUsageRecommendations": True,
        "IncludeDataManagers": False,
        "IncludeMappingInformation": False,
    }
    resp = client.service.GetDetails({"Code": tga_code, "InformationRequest": info})
    ur = getattr(resp, "UsageRecommendations", None)

    recs: List[Dict[str, Any]] = []
    if ur:
        items = getattr(ur, "UsageRecommendation", ur)
        if not isinstance(items, list):
            items = [items]
        for r in items:
            d = serialize_object(r) or {}
            recs.append({
                "type": d.get("Type"),
                "text": d.get("Text"),
                "source": d.get("Source"),
                "url": d.get("URL") or d.get("Url"),
            })
    return {"code": tga_code, "count": len(recs), "recommendations": recs}


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage", "detail": "need mode and code"}))
        sys.exit(1)

    mode = sys.argv[1]
    code = sys.argv[2]

    try:
        if mode == "search":
            out = search_by_anzsco(code)
        elif mode == "advice":
            out = get_training_advice_by_tga_code(code)
        else:
            out = {"error": "unknown_mode", "detail": mode}
            sys.exit(1)

        print(json.dumps(out, ensure_ascii=False, default=str))
        sys.exit(0)
    except Exception as e:
        print(json.dumps({"error": "python_bridge_failed", "detail": str(e)}))
        sys.exit(2)


if __name__ == "__main__":
    main()
