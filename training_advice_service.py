# training_advice_service.py
# 依赖：Flask, requests, zeep
# 运行：python training_advice_service.py

import os
import json
from typing import List, Dict, Any

from flask import Flask, jsonify, request
from requests import Session
from zeep import Client
from zeep.transports import Transport
from zeep.helpers import serialize_object
from zeep.wsse.username import UsernameToken

# ------------------- 配置（可用环境变量覆盖） -------------------
TGA_BASE = os.getenv("TGA_BASE", "https://ws.sandbox.training.gov.au/Deewr.Tga.Webservices")
WSDL_TCS = os.getenv("TGA_WSDL", f"{TGA_BASE}/TrainingComponentService.svc?singleWsdl")
TGA_USER = os.getenv("TGA_USER", "WebService.Read")
TGA_PASS = os.getenv("TGA_PASS", "Asdf098")

# 01 = ANZSCO
ANZSCO_SCHEME = "01"

# Flask
PORT = int(os.getenv("PY_SERVICE_PORT", "8090"))

# ------------------- SOAP 客户端 -------------------
def make_client(timeout: int = 60) -> Client:
    """
    构建 zeep SOAP 客户端。若需要代理，请在环境变量设置 HTTPS_PROXY/HTTP_PROXY。
    """
    session = Session()
    transport = Transport(session=session, timeout=timeout)
    client = Client(WSDL_TCS, transport=transport)
    client.wsse = UsernameToken(TGA_USER, TGA_PASS, use_digest=False)
    return client

# ------------------- 业务函数 -------------------
def search_by_anzsco(anzsco_code: str) -> Dict[str, Any]:
    """
    按 ANZSCO 查询 Training Components（资格/课程/单元等）
    返回：{ anzsco, count, items: [{code, title, componentType, ...}] }
    """
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
    """
    只拉 UsageRecommendations（培训建议），返回 {code, count, recommendations:[{type,text,source,url}]}
    """
    client = make_client()
    info = {
        "IncludeContacts": False,
        "IncludeReleases": False,
        "IncludeCurrencyPeriods": False,
        "IncludeClassifications": False,
        "IncludeUsageRecommendations": True,  # 关键
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
                "text": d.get("Text"),                      # 培训建议正文
                "source": d.get("Source"),
                "url": d.get("URL") or d.get("Url"),
            })
    return {"code": tga_code, "count": len(recs), "recommendations": recs}

def get_advice_by_anzsco(anzsco_code: str, limit: int = 5) -> Dict[str, Any]:
    """
    ANZSCO -> Search -> 对每个 TGA code 获取 UsageRecommendations。
    如果没有任何建议，自动兜底为 Top N 课程 + 官方详情链接。
    """
    search = search_by_anzsco(anzsco_code)

    # 先收集“真的有 UsageRecommendations”的
    out: List[Dict[str, Any]] = []
    for it in (search.get("items") or []):
        if len(out) >= limit:
            break
        tga = it.get("code")
        if not tga:
            continue
        adv = get_training_advice_by_tga_code(tga)
        if (adv.get("count") or 0) > 0:
            out.append({
                "tgaCode": tga,
                "title": it.get("title"),
                "componentType": it.get("componentType"),
                "advice": adv.get("recommendations") or []
            })

    # —— 兜底：完全没有 advice，就返回 Top N 课程 + 详情链接 ——
    if not out:
        fallback_items = []
        for it in (search.get("items") or [])[:limit]:
            code = it.get("code")
            fallback_items.append({
                "tgaCode": code,
                "title": it.get("title"),
                "componentType": it.get("componentType"),
                "advice": None,  # 表示没有 UsageRecommendations
                "link": f"https://training.gov.au/Training/Details/{code}" if code else None
            })
        return {
            "anzsco": anzsco_code,
            "found": 0,                 # 0 = 没有真正的 advice
            "items": fallback_items,
            "note": "No UsageRecommendations in TGA; returned top matches with detail links."
        }

    # 正常返回（有 advice）
    return {
        "anzsco": anzsco_code,
        "found": len(out),             # 有 advice 的条数
        "items": out
    }


# ------------------- Flask 路由 -------------------
app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify({"ok": True, "wsdl": WSDL_TCS})

@app.get("/training-advice/by-anzsco/<anzsco_code>")
def training_advice_by_anzsco(anzsco_code: str):
    code = (anzsco_code or "").strip()
    if not code.isdigit() or not (4 <= len(code) <= 6):
        return jsonify({"error": "invalid_anzsco", "detail": "expect 4-6 digits"}), 400

    try:
        limit = int(request.args.get("limit", "5"))
        limit = max(1, min(limit, 20))
    except Exception:
        limit = 5

    try:
        data = get_advice_by_anzsco(code, limit=limit)
        # 如果你想兜底：当 found=0 时返回 Top N 课程链接，请取消注释以下几行：
        # if data["found"] == 0:
        #     search = search_by_anzsco(code)
        #     fallback = (search["items"] or [])[:limit]
        #     for f in fallback:
        #         f["url"] = f["code"] and f"https://training.gov.au/Training/Details/{f['code']}"
        #     data["fallback"] = fallback
        #     data["note"] = "No UsageRecommendations on TGA; fallback returns top matches with detail links."
        return app.response_class(
            response=json.dumps(data, ensure_ascii=False, default=str),
            status=200,
            mimetype="application/json"
        )
    except Exception as e:
        return jsonify({"error": "server_error", "detail": str(e)}), 500

if __name__ == "__main__":
    print(f"[training-advice] listening on http://localhost:{PORT}")
    print(f"WSDL: {WSDL_TCS}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
