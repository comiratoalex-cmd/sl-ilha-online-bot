// =============================================
// TELEGRAM → SECOND LIFE — BAN / UNBAN
// =============================================

key GROUP_ID = "7b978592-ef6f-d9bf-17be-37b50914d9ae";
string BACKEND_URL = "https://sl-ilha-online-bot-production.up.railway.app";

string lastMsg = "";
string pendingAction = "";
string pendingTarget = "";
key pendingRequest;

// ================= UTIL =================
sendGroup(string msg)
{
    llInstantMessage(GROUP_ID, msg);
}

// ================= POLLING =================
checkBackend()
{
    llHTTPRequest(
        BACKEND_URL + "/say",
        [HTTP_METHOD, "GET"],
        ""
    );
}

default
{
    state_entry()
    {
        llOwnerSay("✅ Sistema de BAN / UNBAN ativo");
        llSetTimerEvent(10.0);
    }

    timer()
    {
        checkBackend();
    }

    http_response(key id, integer status, list meta, string body)
    {
        if (status != 200 || body == "" || body == lastMsg) return;
        lastMsg = body;

        if (llJsonGetValue(body, ["action"]) == JSON_INVALID) return;

        pendingAction = llJsonGetValue(body, ["action"]);
        pendingTarget = llJsonGetValue(body, ["target"]);

        pendingRequest = llName2Key(pendingTarget);
    }

    dataserver(key queryid, string data)
    {
        if (queryid != pendingRequest) return;

        if (data == "")
        {
            llOwnerSay("❌ Avatar não encontrado: " + pendingTarget);
            return;
        }

        key av = (key)data;

        if (pendingAction == "ban")
        {
            llAddToLandBanList(av, 0.0);
            llTeleportAgentHome(av);
            sendGroup("🚫 " + pendingTarget + " foi BANIDO do parcel.");
        }

        if (pendingAction == "unban")
        {
            llRemoveFromLandBanList(av);
            sendGroup("♻️ " + pendingTarget + " foi DESBANIDO do parcel.");
        }

        pendingAction = "";
        pendingTarget = "";
    }
}
