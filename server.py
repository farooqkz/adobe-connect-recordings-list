import requests
from flask import Flask
from flask import request
from flask import abort
from flask import make_response
from flask_caching import Cache
import xml.etree.ElementTree as ET

cache = Cache(config={"CACHE_TYPE": "SimpleCache"})
app = Flask(__name__)
cache.init_app(app)


@cache.memoize(120)
def get_breeze(url, username, password) -> str:
    req = requests.get(f"{url}/api/xml?action=login&login={username}&password={password}")
    return req.cookies.get("BREEZESESSION")


def logout(url, breeze):
    requests.get(f"{url}/api/xml?action=logout&session={breeze}")


@cache.memoize(600)
def get_meetings(url, breeze) -> list:
    req = requests.get(
            f"{url}/api/xml?action=report-my-meetings&session={breeze}",
            stream=True
    )
    tree = ET.parse(req.raw)
    meetings = list()  # {"sco-id": "some number", "name": "Cool meeting"}
    for meeting in tree.iter("meeting"):
        meetings.append({
            "sco-id": meeting.attrib["sco-id"],
            "name": meeting.find("name").text
        })
    return meetings


@cache.memoize(300)
def get_recordings(url, sco_id, breeze) -> list:
    req = requests.get(
            f"{url}/api/xml?action=list-recordings&folder-id={sco_id}&session={breeze}",
            stream=True
    )
    tree = ET.parse(req.raw)
    recordings = list()
    # ^^^ {"date": "2021/12/08", url: "/someweirdurl"}
    for recording in tree.iter("sco"):
        recordings.append({
            "date": recording.find("date-begin").text,
            "url": recording.find("url-path").text
        })
    return recordings


@app.route("/moomoo.mrcow", methods=("POST", "OPTIONS"))
def recordings_list():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "*")
        response.headers.add('Access-Control-Allow-Methods', "*")
        return response

    if not request.is_json:
        abort(404)
    data = dict()
    url = request.json["url"]
    username = request.json["username"]
    password = request.json["password"]
    breeze = get_breeze(url, username, password)
    if breeze is None:
        abort(403)
    for meeting in get_meetings(url, breeze):
        data[meeting["name"]] = get_recordings(url, meeting["sco-id"], breeze)
    response = make_response(data)
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response
