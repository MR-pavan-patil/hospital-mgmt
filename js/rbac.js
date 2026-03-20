// rbac.js v6-fixed — Simple, reliable role-based nav hiding

const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    icon:  '🏥',
    color: '#0ea5e9',
    bg:    'rgba(14,165,233,0.15)',
    canAdd:    ['patients','doctors','appointments','billing','lab','pharmacy','prescriptions'],
    canEdit:   ['patients','doctors','appointments','billing','lab','pharmacy','prescriptions'],
    canDelete: ['patients','doctors','appointments','billing','lab','pharmacy','prescriptions'],
  },
  doctor: {
    label: 'Doctor',
    icon:  '👨‍⚕️',
    color: '#10b981',
    bg:    'rgba(16,185,129,0.15)',
    canAdd:    ['appointments','prescriptions','lab'],
    canEdit:   ['appointments','prescriptions','lab'],
    canDelete: [],
  },
};

let _currentRole = 'admin';

function initRBAC(role) {
  _currentRole = (role === 'doctor') ? 'doctor' : 'admin';
  const cfg = ROLE_CONFIG[_currentRole];
  window.__rbacPerms = cfg;

  // Show/hide nav items based on data-roles attribute
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.getAttribute('data-roles').split(',').map(r => r.trim());
    el.style.display = allowed.includes(_currentRole) ? '' : 'none';
  });

  // Show/hide add buttons
  document.querySelectorAll('[data-rbac-add]').forEach(el => {
    el.style.display = canDo('add', el.dataset.rbacAdd) ? '' : 'none';
  });
}

function canDo(action, module) {
  const perms = window.__rbacPerms || ROLE_CONFIG['admin'];
  if (action === 'add')    return (perms.canAdd    || []).includes(module);
  if (action === 'edit')   return (perms.canEdit   || []).includes(module);
  if (action === 'delete') return (perms.canDelete || []).includes(module);
  return false;
}

function actionBtns(module, id, editFn, deleteFn) {
  let html = '';
  if (canDo('edit',   module)) html += `<button class="btn-icon" onclick="${editFn}('${id}')" title="Edit">✏️</button>`;
  if (canDo('delete', module)) html += `<button class="btn-icon" onclick="${deleteFn}('${id}')" title="Delete">🗑️</button>`;
  if (!html) html = '<span style="color:var(--muted);font-size:11px;padding:2px 6px">View only</span>';
  return html;
}
