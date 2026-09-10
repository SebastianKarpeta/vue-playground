import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'

const router = createRouter({
    history: createWebHistory('/vue/'),
    routes: [
        { path: '/', name: 'dashboard', component: Dashboard },
        { path: '/project/:projectId', name: 'project', component: Dashboard },
        { path: '/project/:projectId/milestone/:milestoneId', name: 'milestone', component: Dashboard },
        { path: '/project/:projectId/milestone/:milestoneId/run/:runId', name: 'run', component: Dashboard },
        { path: '/project/:projectId/run/:runId', name: 'run-no-milestone', component: Dashboard },
    ],
})

export default router