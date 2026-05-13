# Scoreboard App Setup Guide

A quick guide to setting up and running the **Scoreboard App** using **Visual Studio Code**.

---

##  1. Requirements

Make sure you have these installed:

- **Visual Studio Code** → https://code.visualstudio.com/
- **Python 3.10+** → https://www.python.org/downloads/  
  ✅ During installation, check **“Add Python to PATH”**
- **Web Browser** → Chrome, Edge, or Firefox recommended

---

##  2. Recommended VS Code Extensions

Install these extensions for best results:

- Python (Microsoft)
- Pylance
- Live Server (Ritwick Dey)
- HTML CSS Support
- JavaScript (ES6) Code Snippets

---

##  3. Project Structure

Your folder should look like this:

scoreboard-app/
│
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── admin.js
│       └── scoreboard.js
│
├── templates/
│   ├── admin.html
│   ├── login.html
│   ├── scoreboard.html
│   └── setup.html
│
└── app.py

---

##  4. Download and Open in VS Code

1. Click **Code → Download ZIP** on GitHub.
2. Extract the ZIP file.
3. Open **Visual Studio Code**.
4. Go to **File → Open Folder…**
5. Select the extracted `scoreboard-app` folder.

---

##  5. Python Setup

If your app uses Flask or similar, install dependencies:

```bash
pip install -r requirements.txt

If no requirements.txt exists, install Flask manually:
pip install flask

Then run the app:
python app.py


