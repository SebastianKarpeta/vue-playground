import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectList from '../../components/ProjectList.vue'

describe('ProjectList', () => {
    it('emituje select z poprawnym ID po kliknięciu w projekt', async () => {
        const wrapper = mount(ProjectList, {
            props: {
                projects: [
                    { id: 1, name: 'Projekt A' },
                    { id: 2, name: 'Projekt B' },
                ],
                selectedProjectId: null,
            },
        })

        await wrapper.findAll('li')[1].trigger('click')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')[0]).toEqual([2])
    })
})