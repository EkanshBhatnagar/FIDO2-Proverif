# app.py
from flask import Flask, render_template, request, session, redirect, url_for, jsonify
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
from webauthn import generate_registration_options, options_to_json, verify_registration_response
import os
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    UserVerificationRequirement,
)


RP_ID = 'localhost'
RP_NAME = "My Website"
ORIGIN = 'http://localhost:5000'

app = Flask(__name__)
app.secret_key = os.urandom(32)  # For sessions

users = {}  # In-memory user store: username -> dict

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET'])
def register_page():
    return render_template('register.html')

@app.route('/register/begin', methods=['POST'])
def register_begin():
    username =  request.json['username']
    if username in users:
        return jsonify({'fail': 'Username taken.'}), 400
    
    registration_options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=username.encode('utf-8'),
        user_name=username,
    )
    session['registration_challenge'] = registration_options.challenge
    return options_to_json(registration_options)

@app.route('/register/complete', methods=['POST'])
def register_complete():
    try:
        username = request.json['username']
        credential = request.json['credential']

        challenge = session.get('registration_challenge')
        if not challenge:
            return jsonify({'fail':'No challenge in session'}), 400
        
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge,
            expected_rp_id=RP_ID,
            expected_origin=ORIGIN,
            require_user_verification=True,
        )

        # Store credential info
        users[username] = {
            'credential_id': verification.credential_id,
            'credential_public_key': verification.credential_public_key,
            'sign_count': verification.sign_count,
        }

        return jsonify({'success': True})
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Optionally: print(request.json)
        return jsonify({'fail': f'{type(e).__name__}: {e}'}), 400

@app.route('/login', methods=['GET'])
def login_page():
    return render_template('login.html')

@app.route('/login/begin', methods=['POST'])
def login_begin():
    username = request.json['username']
    user = users.get(username)
    if not user:
        return jsonify({'fail': 'No such user'}), 400
    authentication_options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=[PublicKeyCredentialDescriptor(id=user['credential_id'])],
        user_verification=UserVerificationRequirement.REQUIRED,  # <-- the fix!
    )

    session['authn_challenge'] = authentication_options.challenge
    session['authn_username'] = username

    return options_to_json(authentication_options)

@app.route('/login/complete', methods=['POST'])
def login_complete():
    username = session.get('authn_username')
    if not username:
        return jsonify({'fail': 'No username in session'}), 400
    user = users.get(username)
    if not user:
        return jsonify({'fail': 'No such user'}), 400

    credential = request.json['credential']
    challenge = session.get('authn_challenge')
    if not challenge:
        return jsonify({'fail': 'No challenge in session'}), 400

    verification = verify_authentication_response(
        credential=credential,
        expected_challenge=challenge,
        expected_rp_id=RP_ID,
        expected_origin=ORIGIN,
        credential_public_key=user['credential_public_key'],
        credential_current_sign_count=user['sign_count'],
        require_user_verification=True,
    )

    # Update sign count
    user['sign_count'] = verification.new_sign_count

    # Here you would set a user session, etc.
    return jsonify({'success': True})