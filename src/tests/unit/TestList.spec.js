import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TestList from '../../components/TestList.vue'

describe('TestList', () => {
    it('emituje select z poprawnym ID po kliknięciu w test', async () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Test A', status_id: 1 },
                    { id: 2, title: 'Test B', status_id: 5 },
                ],
                selectedTestId: null,
            },
        })

        await wrapper.findAll('li')[1].trigger('click')

        expect(wrapper.emitted('select')).toBeTruthy()
        expect(wrapper.emitted('select')[0]).toEqual([2])
    })

    it('pokazuje czytelną etykietę statusu zamiast samego status_id', () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Test A', status_id: 1 },
                    { id: 2, title: 'Test B', status_id: 5 },
                ],
                selectedTestId: null,
            },
        })

        expect(wrapper.text()).toContain('Passed')
        expect(wrapper.text()).toContain('Failed')
    })

    it('przycisk Wstecz jest wyłączony gdy hasPrev=false, Dalej klikalny gdy hasNext=true', async () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [{ id: 1, title: 'Test A', status_id: 1 }],
                hasPrev: false,
                hasNext: true,
            },
        })

        expect(wrapper.find('[data-testid="tests-prev"]').attributes('disabled')).toBeDefined()

        await wrapper.find('[data-testid="tests-next"]').trigger('click')

        expect(wrapper.emitted('next-page')).toBeTruthy()
    })

    it('zmiana selecta rozmiaru strony emituje change-page-size z liczbą', async () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [{ id: 1, title: 'Test A', status_id: 1 }],
                pageSize: 20,
            },
        })

        await wrapper.find('[data-testid="tests-page-size"]').setValue('100')

        expect(wrapper.emitted('change-page-size')).toBeTruthy()
        expect(wrapper.emitted('change-page-size')[0]).toEqual([100])
    })
})
