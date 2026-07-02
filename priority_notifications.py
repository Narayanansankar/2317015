# Stage 6 - find top 10 priority notifications
# priority = weight of type (Placement > Result > Event) + how recent it is
# using heapq so we don't have to sort everything again and again

import heapq
import json
import os
import urllib.request
from datetime import datetime
API_URL = "http://4.224.186.213/evaluation-service/notifications"
TYPE_WEIGHT = {
    "Placement": 3,
    "Result": 2,
    "Event": 1,
}
def get_score(notification):
    weight = TYPE_WEIGHT.get(notification.get("Type"), 0)
    timestamp = notification.get("Timestamp")
    time_value = datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S").timestamp()
    return weight * 1000000000000 + time_value


def fetch_notifications():
    token = os.environ.get("ACCESS_TOKEN", "")
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(API_URL, headers=headers)
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read())

    return data.get("notifications", [])
def main():
    top_n = 10
    heap = []  # this will only keep top 10 at any time
    counter = 0  # just so heapq doesnt try comparing dicts if score is same

    notifications = fetch_notifications()
    print("Fetched", len(notifications), "notifications from API\n")

    # get score of each notification and add to heap if it is in top 10
    for notification in notifications:
        score = get_score(notification)
        entry = (score, counter, notification)
        counter = counter + 1
        # if we have more than top_n notifications
        if len(heap) < top_n:
            heapq.heappush(heap, entry)
        else:
            if score > heap[0][0]:
                heapq.heapreplace(heap, entry)
    top = sorted(heap, key=lambda item: item[0], reverse=True)
    print("Top", top_n, "priority notifications:\n")
    for i, (score, count, notification) in enumerate(top, start=1):
        print(str(i) + ". [" + notification.get("Type") + "] " +
              notification.get("Message") + " - " + notification.get("Timestamp"))
if __name__ == "__main__":
    main()
