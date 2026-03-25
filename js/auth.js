// auth.js v8 — Smart role detection on signup

async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

// On signup: auto-detect role from doctors table
async function signUp(email, password, name, role) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
        // Check if this email exists in doctors table → force role=doctor
        const { data: docRow } = await sb
            .from('doctors')
            .select('id, name')
            .ilike('email', email.trim())
            .maybeSingle();

        const finalRole = docRow ? 'doctor' : (role || 'admin');
        const finalName = docRow ? .name || name;

        await sb.from('profiles').upsert({
            id: data.user.id,
            name: finalName,
            role: finalRole,
        });
    }
    return data;
}

async function signOut() {
    await sb.auth.signOut();
    window.location.href = 'index.html';
}

async function getSession() {
    const { data } = await sb.auth.getSession();
    return data.session;
}

async function getCurrentProfile() {
    const session = await getSession();
    if (!session) return null;
    const { data } = await sb
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    return data;
}