import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EntitySelect from '../../components/EntitySelect.vue'

describe('EntitySelect', () => {
    it('emituje select z poprawnym ID po zmianie wartości', async () => {
        const wrapper = mount(EntitySelect, {
            props: {
                label: 'Projekt',
                items: [
                    { id: 1, name: 'Projekt A' },
                    { id: 2, name: 'Projekt B' },
                ],
                selectedId: null,
            },
        })

        await wrapper.find('select').setValue('2')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')[0]).toEqual([2])
    })

    it('emituje select z null po wybraniu placeholdera', async () => {
        const wrapper = mount(EntitySelect, {
            props: {
                label: 'Projekt',
                items: [{ id: 1, name: 'Projekt A' }],
                selectedId: 1,
            },
        })

        await wrapper.find('select').setValue('')

        expect(wrapper.emitted('select')[0]).toEqual([null])
    })

    it('jest wyłączony gdy disabled=true', () => {
        const wrapper = mount(EntitySelect, {
            props: {
                label: 'Milestone',
                items: [],
                disabled: true,
            },
        })

        expect(wrapper.find('select').attributes('disabled')).toBeDefined()
    })
})
