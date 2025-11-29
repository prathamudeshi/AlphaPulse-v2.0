import requests
import json

BASE_URL = "http://127.0.0.1:8005/api"

def test_goals():
    # 1. Login
    print("Logging in...")
    # Assuming a user exists, or register one. Let's try to register a temp user or use existing credentials if known.
    # I'll try to register a new user for testing to be safe.
    username = "test_architect_user"
    password = "testpassword123"
    email = "test@example.com"
    
    try:
        requests.post(f"{BASE_URL}/auth/register/", json={'username': username, 'password': password, 'email': email})
    except:
        pass # User might exist

    resp = requests.post(f"{BASE_URL}/auth/login/", json={'username': username, 'password': password})
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return

    token = resp.json()['access']
    headers = {'Authorization': f'Bearer {token}'}
    print("Login successful.")

    # 2. Generate Plan
    print("\nTesting Generate Plan...")
    payload = {
        'target_amount': 1000000,
        'years': 3,
        'risk_profile': 'balanced'
    }
    resp = requests.post(f"{BASE_URL}/goals/plan/", json=payload, headers=headers)
    if resp.status_code == 200:
        print("Plan Generated:")
        print(json.dumps(resp.json(), indent=2))
        plan = resp.json()
    else:
        print(f"Generate Plan failed: {resp.text}")
        return

    # 3. Create Goal
    print("\nTesting Create Goal...")
    goal_payload = {
        'name': 'Test Car Goal',
        'target_amount': 1000000,
        'deadline': '2028-01-01',
        'monthly_contribution': plan['monthly_contribution'],
        'items': plan['portfolio']
    }
    resp = requests.post(f"{BASE_URL}/goals/create/", json=goal_payload, headers=headers)
    if resp.status_code == 200:
        print("Goal Created:")
        print(resp.json())
        goal_id = resp.json()['id']
    else:
        print(f"Create Goal failed: {resp.text}")
        return

    # 4. Get Goals
    print("\nTesting Get Goals...")
    resp = requests.get(f"{BASE_URL}/goals/", headers=headers)
    if resp.status_code == 200:
        print("Goals List:")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"Get Goals failed: {resp.text}")

    # 5. Update Progress
    print("\nTesting Update Progress...")
    resp = requests.post(f"{BASE_URL}/goals/{goal_id}/progress/", json={'amount': 50000}, headers=headers)
    if resp.status_code == 200:
        print("Progress Updated.")
    else:
        print(f"Update Progress failed: {resp.text}")

    # Verify Update
    resp = requests.get(f"{BASE_URL}/goals/", headers=headers)
    goals = resp.json()
    print(f"Updated Current Amount: {goals[0]['current_amount']}")

if __name__ == "__main__":
    test_goals()
