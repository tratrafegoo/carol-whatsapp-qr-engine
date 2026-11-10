import json
import os

reminder_configs = {
    "flow_funil_1": {
        "label": "⏰ Lembrete: Conseguiu ver o material? (15 min)",
        "text": "Conseguiu ver o material?",
        "delayMinutes": 15
    },
    "flow_funil_2": {
        "label": "⏰ Lembrete: Conseguiu ver o MATERIAL? (20 min)",
        "text": "Olá! 🙏\n\nConseguiu ver o MATERIAL?\n\nSe o material agregou você, conto com sua contribuição para manter esse projeto e continuar criando novos materiais. 🔧\n\nApós o comprovante, libero também seus bônus exclusivos.\n\nDeus abençoe! ✝️",
        "delayMinutes": 20
    },
    "flow_funil_3": {
        "label": "⏰ Lembrete: Conseguiu conferir os 500 Esboços? (20 min)",
        "text": "Irmã, a Paz do Senhor! 🙏\n\nConseguiu conferir os 500 Esboços?\n\nFico no aguardo do comprovante para te enviar o acesso à Comunidade VIP e todos os 4 bônus exclusivos! Que Deus te abençoe! 💛",
        "delayMinutes": 20
    },
    "flow_funil_4": {
        "label": "⏰ Lembrete: Faltou alguma coisa? (15 min)",
        "text": "Faltou alguma coisa?",
        "delayMinutes": 15
    },
    "flow_funil_5": {
        "label": "⏰ Lembrete: Fiquei aqui esperando o pagamento (10 min)",
        "text": "Paz.. Fiquei aqui esperando o pagamento, confiei na sua palavra...",
        "delayMinutes": 10
    },
    "flow_funil_6": {
        "label": "⏰ Lembrete: Conseguiu ver o devocional? (20 min)",
        "text": "A paz do Senhor, irmã! Conseguiu ver o devocional?\n\nFico no aguardo do comprovante para te colocar no nosso altar de oração e liberar o sorteio da Caixa Devocional! 🙏❤️",
        "delayMinutes": 20
    },
    "flow_funil_7": {
        "label": "⏰ Lembrete: Conseguiu imprimir o construtor? (20 min)",
        "text": "Oi! Conseguiu imprimir o construtor de palavras para o seu pequeno?\n\nFico no aguardo do comprovante para liberar o material completo de alfabetização e os 5 jogos extras! 🎈",
        "delayMinutes": 20
    },
    "flow_funil_8": {
        "label": "⏰ Lembrete: Conseguiu ver as receitas pet? (20 min)",
        "text": "Oi! Conseguiu dar uma olhada no Guia do Pet Comilão?\n\nAssim que puder me envie o comprovante do Pix para eu te enviar o cardápio e todos os bônus! 🐶💚",
        "delayMinutes": 20
    },
    "flow_funil_9": {
        "label": "⏰ Lembrete: Conseguiu ver as receitas de limpeza? (20 min)",
        "text": "Olá! Conseguiu ver as receitas de limpeza?\n\nFico no aguardo do comprovante para liberar o seu acesso completo aos vídeos e suporte! 🧼✨",
        "delayMinutes": 20
    },
    "flow_funil_10": {
        "label": "⏰ Lembrete: Conseguiu abrir os moldes de bolsas? (20 min)",
        "text": "Oi! Conseguiu abrir os moldes de bolsas?\n\nAssim que fizer a contribuição me envie o comprovante para eu liberar o aplicativo completo e o certificado! 🧵👜",
        "delayMinutes": 20
    },
    "flow_funil_11": {
        "label": "⏰ Lembrete: Deu tudo certo com o Mente Viva? (20 min)",
        "text": "Olá! Deu tudo certo com o material Mente Viva?\n\nFico no aguardo do comprovante para liberar o aplicativo de exercícios diários para a memória! 🧠💛",
        "delayMinutes": 20
    },
    "flow_funil_12": {
        "label": "⏰ Lembrete: Conseguiu conferir o Cardápio? (20 min)",
        "text": "Paz! Conseguiu conferir o Cardápio Adventista?\n\nAssim que contribuir no Pix me envie o comprovante para eu liberar seus 2 bônus de saúde! 🥗🙏",
        "delayMinutes": 20
    },
    "flow_funil_13": {
        "label": "⏰ Lembrete: Conseguiu ver a oração pelos filhos? (20 min)",
        "text": "A paz do Senhor! Conseguiu ver a oração pelos filhos?\n\nFico no aguardo do comprovante para colocar o nome do seu filho em nosso altar de oração diário! 🙏❤️",
        "delayMinutes": 20
    }
}

target_files = [
    "cloud-qr-engine/default_flows.json",
    "client/src/lib/default_flows.json",
    "server/default_flows.json"
]

for file_path in target_files:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        flows = json.load(f)

    for flow in flows:
        fid = flow.get("_id")
        cfg = reminder_configs.get(fid)
        if not cfg:
            continue
        
        flow_data = flow.get("draftVersion", {}).get("flowData", {})
        nodes = flow_data.get("nodes", [])
        edges = flow_data.get("edges", [])

        # Verifica se já tem o nó de lembrete
        reminder_node_id = f"node_{fid}_reminder"
        if any(n.get("nodeId") == reminder_node_id for n in nodes):
            continue

        pv_node = next((n for n in nodes if (n.get("nodeType") or "").upper() == "PIX_VERIFIER"), None)
        if not pv_node:
            continue

        # Encontra a aresta que entra no PIX_VERIFIER
        pv_id = pv_node.get("nodeId")
        incoming_edge = next((e for e in edges if (e.get("targetNodeId") or e.get("target")) == pv_id), None)
        if not incoming_edge:
            continue

        prev_node_id = incoming_edge.get("sourceNodeId") or incoming_edge.get("source")
        prev_node = next((n for n in nodes if n.get("nodeId") == prev_node_id), None)

        prev_pos = prev_node.get("position", {"x": 320, "y": 2000}) if prev_node else {"x": 320, "y": 2000}
        rem_y = prev_pos.get("y", 2000) + 140

        # Cria o nó de lembrete
        reminder_node = {
            "nodeId": reminder_node_id,
            "nodeType": "MESSAGE",
            "position": {"x": 320, "y": rem_y},
            "label": cfg["label"],
            "config": {
                "text": cfg["text"],
                "messageText": cfg["text"],
                "isReminder": True,
                "delayMinutes": cfg["delayMinutes"]
            }
        }

        # Insere antes do PIX_VERIFIER
        pv_index = nodes.index(pv_node)
        nodes.insert(pv_index, reminder_node)

        # Ajusta posição dos nós subsequentes
        for n in nodes[pv_index + 1:]:
            if "position" in n and "y" in n["position"]:
                n["position"]["y"] += 140

        # Atualiza as arestas
        # 1. Aresta incoming agora aponta para reminder_node
        incoming_edge["targetNodeId"] = reminder_node_id
        incoming_edge["target"] = reminder_node_id
        incoming_edge["id"] = f"e_{prev_node_id}_{reminder_node_id}"
        incoming_edge["edgeId"] = f"e_{prev_node_id}_{reminder_node_id}"

        # 2. Nova aresta do reminder_node para pv_node
        new_edge = {
            "id": f"e_{reminder_node_id}_{pv_id}",
            "edgeId": f"e_{reminder_node_id}_{pv_id}",
            "source": reminder_node_id,
            "sourceNodeId": reminder_node_id,
            "target": pv_id,
            "targetNodeId": pv_id,
            "animated": True
        }
        edges.append(new_edge)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(flows, f, ensure_ascii=False, indent=2)

print("✅ Todos os 13 funis atualizados com nó de lembrete follow-up!")

