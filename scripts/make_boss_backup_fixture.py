import json
import os

def make_fixture():
    backup = {
        "app": "Maple Tools",
        "tool": "boss-income-calculator",
        "schemaVersion": 2,
        "exportedAt": "2026-06-16T12:00:00.000Z",
        "exportedAtKstLabel": "2026-06-16",
        "data": {
            "characters": [
                {
                    "id": "char-test-a",
                    "name": "테스트 캐릭터 A",
                    "job": "히어로",
                    "selectedBosses": {
                        "weekly:lotus:easy": {"completed": True, "period": "weekly"},
                        "weekly:damien:easy": {"completed": True, "period": "weekly"}
                    },
                    "monthlyRecords": {},
                    "seasonalRecords": {}
                },
                {
                    "id": "char-test-b",
                    "name": "테스트 캐릭터 B",
                    "job": "비숍",
                    "selectedBosses": {
                        "weekly:lotus:normal": {"completed": False, "period": "weekly"}
                    },
                    "monthlyRecords": {},
                    "seasonalRecords": {}
                }
            ],
            "activeCharacterId": "char-test-a",
            "weeklyActualRecords": {
                "2026-05-W4": {
                    "schemaVersion": 1,
                    "weekKey": "2026-05-W4",
                    "monthKey": "2026-05",
                    "weekLabel": "5월 4주차",
                    "startKstDate": "2026-05-22",
                    "endKstDate": "2026-05-28",
                    "completedCharacters": {},
                    "manualActualMeso": 3500000000,
                    "manualCrystalCount": None,
                    "manualNote": "수동 입력",
                    "manualUpdatedAt": "2026-05-29T12:00:00.000Z"
                },
                "2026-06-W1": {
                    "schemaVersion": 1,
                    "weekKey": "2026-06-W1",
                    "monthKey": "2026-06",
                    "weekLabel": "6월 1주차",
                    "startKstDate": "2026-06-05",
                    "endKstDate": "2026-06-11",
                    "completedCharacters": {},
                    "manualActualMeso": 4800000000,
                    "manualCrystalCount": None,
                    "manualNote": "수동 입력",
                    "manualUpdatedAt": "2026-06-12T12:00:00.000Z"
                },
                "2026-06-W2": {
                    "schemaVersion": 1,
                    "weekKey": "2026-06-W2",
                    "monthKey": "2026-06",
                    "weekLabel": "6월 2주차",
                    "startKstDate": "2026-06-12",
                    "endKstDate": "2026-06-18",
                    "completedCharacters": {
                        "char-test-a": {
                            "name": "테스트 캐릭터 A",
                            "job": "히어로",
                            "crystalCount": 12,
                            "actualMeso": 1500000000,
                            "completedAt": "2026-06-15T15:30:00.000Z"
                        }
                    }
                }
            },
            "uiPreferences": {
                "bossOrderMode": "default",
                "weeklyFilter": "all",
                "sectionCollapse": {}
            }
        }
    }
    
    out_dir = "test-fixtures/boss-income-calculator"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "boss-backup-schema-v2-weekly-records-sample.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
    print(f"Fixture created successfully at {out_path}")

if __name__ == "__main__":
    make_fixture()
