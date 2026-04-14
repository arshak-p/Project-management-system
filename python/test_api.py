import urllib.request
import json
import traceback

def test_user():
    try:
        # Login
        req = urllib.request.Request(
            'http://127.0.0.1:8000/api/auth/login/',
            data=json.dumps({'email': 'shanu@gmail.com', 'password': 'Welcome@1234'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        response = urllib.request.urlopen(req)
        token = json.loads(response.read())['access']
        print("Login Success")

        endpoints = [
            '/api/users/me/',
            '/api/notifications/',
            '/api/work-items/'
        ]

        for ep in endpoints:
            req = urllib.request.Request(
                f'http://127.0.0.1:8000{ep}',
                headers={'Authorization': f'Bearer {token}'}
            )
            try:
                res = urllib.request.urlopen(req)
                print(f"{ep}: {res.status}")
            except urllib.error.HTTPError as e:
                print(f"{ep}: {e.code}")
                try:
                    resp_str = e.read().decode('utf-8')
                    if "Exception" in resp_str:
                        print(resp_str.split('<title>')[1].split('</title>')[0])
                except:
                    pass
                
    except Exception as e:
        print("Error:", e)
        traceback.print_exc()

if __name__ == '__main__':
    test_user()
