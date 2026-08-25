export default {
    async fetch(request, env) {
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Route requests
            if (path === '/api/auth/register') {
                return await handleRegister(request, env, corsHeaders);
            } else if (path === '/api/auth/login') {
                return await handleLogin(request, env, corsHeaders);
            } else if (path === '/api/auth/logout') {
                return await handleLogout(request, env, corsHeaders);
            } else if (path === '/api/sync/pull') {
                return await handlePull(request, env, corsHeaders);
            } else if (path === '/api/sync/push') {
                return await handlePush(request, env, corsHeaders);
            } else {
                return jsonResponse({ error: '未找到' }, 404, corsHeaders);
            }
        } catch (error) {
            const status = error instanceof HttpError ? error.status : 500;
            if (status === 500) {
                console.error('Worker request failed:', error);
            }
            return jsonResponse(
                { error: status === 500 ? '服务器内部错误' : error.message },
                status,
                corsHeaders,
            );
        }
    },
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const TOKEN_RENEW_WINDOW_MS = 60 * 60 * 24 * 7 * 1000;

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Helper: JSON response
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
}

// Helper: Hash password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Helper: Generate token
function generateToken() {
    return crypto.randomUUID();
}

// Store an expiry timestamp in the value as well as relying on KV expiry. This
// lets active sessions renew only near expiry instead of writing on every call.
async function saveToken(env, token, email) {
    const session = {
        email,
        expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
    };
    await env.NewTab_KV.put(`token:${token}`, JSON.stringify(session), {
        expirationTtl: TOKEN_TTL_SECONDS,
    });
}

// Helper: Verify token
async function verifyToken(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new HttpError(401, '未授权');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
        throw new HttpError(401, '未授权');
    }

    const storedSession = await env.NewTab_KV.get(`token:${token}`);
    if (!storedSession) {
        throw new HttpError(401, '登录已过期，请重新登录');
    }

    let session;
    try {
        session = JSON.parse(storedSession);
    } catch {
        throw new HttpError(401, '登录已过期，请重新登录');
    }

    if (!session || typeof session.email !== 'string' ||
        !Number.isFinite(Number(session.expiresAt))) {
        throw new HttpError(401, '登录已过期，请重新登录');
    }

    const email = session.email;
    const expiresAt = Number(session.expiresAt);
    if (expiresAt <= Date.now()) {
        await env.NewTab_KV.delete(`token:${token}`);
        throw new HttpError(401, '登录已过期，请重新登录');
    }

    if (expiresAt - Date.now() <= TOKEN_RENEW_WINDOW_MS) {
        await saveToken(env, token, email);
    }

    return email;
}

// Handler: Register
async function handleRegister(request, env, corsHeaders) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return jsonResponse({ error: '需要邮箱和密码' }, 400, corsHeaders);
    }

    // Check if user exists
    const existingUser = await env.NewTab_KV.get(`user:${email}`);
    if (existingUser) {
        return jsonResponse({ error: '用户已存在' }, 409, corsHeaders);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = {
        email,
        passwordHash,
        createdAt: Date.now(),
    };

    await env.NewTab_KV.put(`user:${email}`, JSON.stringify(user));

    // Generate token
    const token = generateToken();
    await saveToken(env, token, email);

    return jsonResponse({ token, email }, 201, corsHeaders);
}

// Handler: Login
async function handleLogin(request, env, corsHeaders) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return jsonResponse({ error: '需要邮箱和密码' }, 400, corsHeaders);
    }

    // Get user
    const userData = await env.NewTab_KV.get(`user:${email}`);
    if (!userData) {
        return jsonResponse({ error: '凭证无效' }, 401, corsHeaders);
    }

    const user = JSON.parse(userData);

    // Verify password
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
        return jsonResponse({ error: '凭证无效' }, 401, corsHeaders);
    }

    // Generate token
    const token = generateToken();
    await saveToken(env, token, email);

    return jsonResponse({ token, email }, 200, corsHeaders);
}

// Handler: Logout
async function handleLogout(request, env, corsHeaders) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return jsonResponse({ error: '未授权' }, 401, corsHeaders);
        }

        const token = authHeader.substring(7);
        
        // Delete token from KV
        await env.NewTab_KV.delete(`token:${token}`);

        return jsonResponse({ success: true }, 200, corsHeaders);
    } catch (error) {
        return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
}

// Handler: Pull data
async function handlePull(request, env, corsHeaders) {
    const email = await verifyToken(request, env);

    // Get sync data
    const syncData = await env.NewTab_KV.get(`sync:${email}`);

    if (!syncData) {
        return jsonResponse({ data: null }, 200, corsHeaders);
    }

    return jsonResponse({ data: JSON.parse(syncData) }, 200, corsHeaders);
}

// Handler: Push data
async function handlePush(request, env, corsHeaders) {
    const email = await verifyToken(request, env);
    const data = await request.json();

    // Validate data structure: at least one valid field required
    const hasValidData = 
        (data.todos && Array.isArray(data.todos)) ||
        (data.notes && Array.isArray(data.notes)) ||
        (data.shortcuts && Array.isArray(data.shortcuts)) ||
        (data.gridConfig && typeof data.gridConfig === 'object') ||
        (data.bgConfig && typeof data.bgConfig === 'object') ||
        (data.bgUrl && typeof data.bgUrl === 'string');

    if (!hasValidData) {
        return jsonResponse({ error: '无效的数据结构' }, 400, corsHeaders);
    }

    // Add timestamp
    const syncData = {
        ...data,
        updatedAt: Date.now(),
    };

    // Save to KV
    await env.NewTab_KV.put(`sync:${email}`, JSON.stringify(syncData));
    return jsonResponse({ success: true, updatedAt: syncData.updatedAt }, 200, corsHeaders);
}
