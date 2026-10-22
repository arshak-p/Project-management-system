import os
import re

# Update api.ts
with open('frontend/src/api.ts', 'r') as f:
    api_content = f.read()

# Update createUser
api_content = api_content.replace(
    'createUser: (data: Record<string, any>) => api.post(\'/accounts/create-user/\', data),',
    'createUser: (data: Record<string, any>) => api.post(\'/accounts/create-user/\', data),'
) # Already takes Record<string, any> so it's fine.

# Remove activateAccount and resendActivation
api_content = re.sub(r'activateAccount:.*?,\n', '', api_content, flags=re.DOTALL)
api_content = re.sub(r'resendActivation:.*?,\n', '', api_content, flags=re.DOTALL)

with open('frontend/src/api.ts', 'w') as f:
    f.write(api_content)

# Update App.tsx
with open('frontend/src/App.tsx', 'r') as f:
    app_content = f.read()

app_content = re.sub(r"import ActivationScreen from './pages/ActivationScreen';\n", "", app_content)
app_content = re.sub(r"if \(path === '/activate'\) \{.*?\}\n", "", app_content, flags=re.DOTALL)

with open('frontend/src/App.tsx', 'w') as f:
    f.write(app_content)

# Delete ActivationScreen.tsx
if os.path.exists('frontend/src/pages/ActivationScreen.tsx'):
    os.remove('frontend/src/pages/ActivationScreen.tsx')
