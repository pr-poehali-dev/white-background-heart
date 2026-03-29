import json
import os
import base64
import hmac
import hashlib
import datetime
import urllib.request
import re
import unicodedata

def _sign(key, msg):
    return hmac.new(key, msg.encode('utf-8'), hashlib.sha256).digest()

def _get_signature_key(key, date_stamp, region, service):
    k_date = _sign(('AWS4' + key).encode('utf-8'), date_stamp)
    k_region = _sign(k_date, region)
    k_service = _sign(k_region, service)
    k_signing = _sign(k_service, 'aws4_request')
    return k_signing

def s3_put(bucket, key, body, content_type, access_key, secret_key):
    endpoint = 'https://bucket.poehali.dev'
    region = 'us-east-1'
    service = 's3'

    now = datetime.datetime.utcnow()
    amz_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = now.strftime('%Y%m%d')

    host = 'bucket.poehali.dev'
    canonical_uri = f'/{bucket}/{key}'
    canonical_querystring = ''

    payload_hash = hashlib.sha256(body).hexdigest()

    canonical_headers = (
        f'content-type:{content_type}\n'
        f'host:{host}\n'
        f'x-amz-content-sha256:{payload_hash}\n'
        f'x-amz-date:{amz_date}\n'
    )
    signed_headers = 'content-type;host;x-amz-content-sha256;x-amz-date'

    canonical_request = '\n'.join([
        'PUT', canonical_uri, canonical_querystring,
        canonical_headers, signed_headers, payload_hash
    ])

    credential_scope = f'{date_stamp}/{region}/{service}/aws4_request'
    string_to_sign = '\n'.join([
        'AWS4-HMAC-SHA256', amz_date, credential_scope,
        hashlib.sha256(canonical_request.encode('utf-8')).hexdigest()
    ])

    signing_key = _get_signature_key(secret_key, date_stamp, region, service)
    signature = hmac.new(signing_key, string_to_sign.encode('utf-8'), hashlib.sha256).hexdigest()

    authorization = (
        f'AWS4-HMAC-SHA256 Credential={access_key}/{credential_scope}, '
        f'SignedHeaders={signed_headers}, Signature={signature}'
    )

    url = f'{endpoint}/{bucket}/{key}'
    req = urllib.request.Request(url, data=body, method='PUT')
    req.add_header('Content-Type', content_type)
    req.add_header('x-amz-date', amz_date)
    req.add_header('x-amz-content-sha256', payload_hash)
    req.add_header('Authorization', authorization)
    req.add_header('Host', host)

    with urllib.request.urlopen(req) as resp:
        return resp.status


def handler(event: dict, context) -> dict:
    """Загрузка аудиофайла в S3 и возврат CDN-ссылки."""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body', '{}'))
    file_data = body.get('file')
    filename = body.get('filename', 'track.mp3')
    content_type = body.get('contentType', 'audio/mpeg')

    if not file_data:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Файл не передан'})
        }

    audio_bytes = base64.b64decode(file_data)
    access_key = os.environ['AWS_ACCESS_KEY_ID']
    secret_key = os.environ['AWS_SECRET_ACCESS_KEY']

    # Транслитерация: убираем не-ASCII символы из имени файла
    safe_name = unicodedata.normalize('NFKD', filename).encode('ascii', 'ignore').decode('ascii')
    safe_name = re.sub(r'[^\w.\-]', '_', safe_name) or 'track.mp3'
    key = f'audio/{safe_name}'
    s3_put('files', key, audio_bytes, content_type, access_key, secret_key)

    cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/files/{key}"

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'url': cdn_url})
    }