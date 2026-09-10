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

        await wrapper.findAll('[data-testid="test-item"]')[1].trigger('click')

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

    it('detailsLoading=true pokazuje spinner z informacją o doładowywaniu (przyciski i tak sterowane przez hasNext/hasPrev)', () => {
        const loadingWrapper = mount(TestList, {
            props: {
                tests: [{ id: 1, title: 'Test A', status_id: 1 }],
                hasPrev: false,
                hasNext: false,
                detailsLoading: true,
            },
        })
        expect(loadingWrapper.find('[data-testid="tests-details-loading"]').exists()).toBe(true)
        expect(loadingWrapper.text()).toContain('Doładowywanie dat i wyników')

        const doneWrapper = mount(TestList, {
            props: {
                tests: [{ id: 1, title: 'Test A', status_id: 1 }],
                hasPrev: false,
                hasNext: true,
                detailsLoading: false,
            },
        })
        expect(doneWrapper.find('[data-testid="tests-details-loading"]').exists()).toBe(false)
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

    it('pokazuje sformatowane daty utworzenia/modyfikacji, a "…" gdy jeszcze nie doszły', () => {
        const created = Date.UTC(2024, 0, 15) / 1000
        const updated = Date.UTC(2024, 5, 1) / 1000
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Test A', status_id: 1 },
                    { id: 2, title: 'Test B', status_id: 1 },
                ],
                caseDates: { 1: { created_on: created, updated_on: updated } },
            },
        })

        const createdCells = wrapper.findAll('[data-testid="test-item-created"]')
        const modifiedCells = wrapper.findAll('[data-testid="test-item-modified"]')
        expect(createdCells[0].text()).toContain('15.01.2024')
        expect(modifiedCells[0].text()).toContain('01.06.2024')
        expect(createdCells[1].text()).toContain('…')
    })

    it('filtruje po zakresie daty utworzenia', async () => {
        const jan = Date.UTC(2024, 0, 10) / 1000
        const jun = Date.UTC(2024, 5, 10) / 1000
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Styczniowy', status_id: 1 },
                    { id: 2, title: 'Czerwcowy', status_id: 1 },
                ],
                caseDates: {
                    1: { created_on: jan, updated_on: jan },
                    2: { created_on: jun, updated_on: jun },
                },
            },
        })

        // domyślnie radio jest na "Utworzenie"
        await wrapper.find('[data-testid="filter-date-from"]').setValue('2024-05-01')

        const items = wrapper.findAll('[data-testid="test-item"]')
        expect(items).toHaveLength(1)
        expect(items[0].text()).toContain('Czerwcowy')
    })

    it('radio przełącza filtr dat z "Utworzenie" na "Modyfikacja"', async () => {
        const jan = Date.UTC(2024, 0, 10) / 1000
        const jun = Date.UTC(2024, 5, 10) / 1000
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Zmieniony w styczniu', status_id: 1 },
                    { id: 2, title: 'Zmieniony w czerwcu', status_id: 1 },
                ],
                caseDates: {
                    // obydwa utworzone w styczniu, ale zmodyfikowane w różnych miesiącach
                    1: { created_on: jan, updated_on: jan },
                    2: { created_on: jan, updated_on: jun },
                },
            },
        })

        await wrapper.find('[data-testid="filter-date-field-modified"]').setValue(true)
        await wrapper.find('[data-testid="filter-date-from"]').setValue('2024-05-01')

        const items = wrapper.findAll('[data-testid="test-item"]')
        expect(items).toHaveLength(1)
        expect(items[0].text()).toContain('Zmieniony w czerwcu')
    })

    it('przycisk "Wyczyść filtry" pojawia się po ustawieniu filtra i czyści wszystkie pola', async () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [{ id: 1, title: 'Test A', status_id: 1 }],
            },
        })

        expect(wrapper.find('[data-testid="filter-tests-clear"]').exists()).toBe(false)

        await wrapper.find('[data-testid="tests-search"]').setValue('Test A')
        expect(wrapper.find('[data-testid="filter-tests-clear"]').exists()).toBe(true)

        await wrapper.find('[data-testid="filter-tests-clear"]').trigger('click')
        expect(wrapper.find('[data-testid="tests-search"]').element.value).toBe('')
        expect(wrapper.find('[data-testid="filter-tests-clear"]').exists()).toBe(false)
    })

    it('klik w nagłówek "Utworzono" sortuje rosnąco, drugi klik odwraca na malejąco', async () => {
        const jan = Date.UTC(2024, 0, 10) / 1000
        const jun = Date.UTC(2024, 5, 10) / 1000
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Czerwcowy', status_id: 1 },
                    { id: 2, title: 'Styczniowy', status_id: 1 },
                ],
                caseDates: {
                    1: { created_on: jun, updated_on: jun },
                    2: { created_on: jan, updated_on: jan },
                },
            },
        })

        await wrapper.find('[data-testid="sort-created"]').trigger('click')
        let titles = wrapper.findAll('[data-testid="test-item"]').map((w) => w.text())
        expect(titles[0]).toContain('Styczniowy')
        expect(titles[1]).toContain('Czerwcowy')

        await wrapper.find('[data-testid="sort-created"]').trigger('click')
        titles = wrapper.findAll('[data-testid="test-item"]').map((w) => w.text())
        expect(titles[0]).toContain('Czerwcowy')
        expect(titles[1]).toContain('Styczniowy')
    })

    it('testy bez jeszcze wczytanej daty lądują na końcu, niezależnie od kierunku sortowania', async () => {
        const jan = Date.UTC(2024, 0, 10) / 1000
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, title: 'Bez daty', status_id: 1 },
                    { id: 2, title: 'Ze styczniem', status_id: 1 },
                ],
                caseDates: {
                    2: { created_on: jan, updated_on: jan },
                    // dla id 1 brak wpisu — jakby jeszcze się nie doładował
                },
            },
        })

        await wrapper.find('[data-testid="sort-created"]').trigger('click')
        let titles = wrapper.findAll('[data-testid="test-item"]').map((w) => w.text())
        expect(titles[titles.length - 1]).toContain('Bez daty')

        await wrapper.find('[data-testid="sort-created"]').trigger('click') // malejąco
        titles = wrapper.findAll('[data-testid="test-item"]').map((w) => w.text())
        expect(titles[titles.length - 1]).toContain('Bez daty')
    })

    it('wyszukiwarka pasuje też po numerze case\'a, z "C" lub bez', async () => {
        const wrapper = mount(TestList, {
            props: {
                tests: [
                    { id: 1, case_id: 9158, title: 'Coś tam', status_id: 1 },
                    { id: 2, case_id: 30500, title: 'Inny tytuł', status_id: 1 },
                ],
            },
        })

        await wrapper.find('[data-testid="tests-search"]').setValue('9158')
        let items = wrapper.findAll('[data-testid="test-item"]')
        expect(items).toHaveLength(1)
        expect(items[0].text()).toContain('Coś tam')

        await wrapper.find('[data-testid="tests-search"]').setValue('c9158')
        items = wrapper.findAll('[data-testid="test-item"]')
        expect(items).toHaveLength(1)
        expect(items[0].text()).toContain('Coś tam')
    })

    // `page` jest teraz propem sterowanym przez rodzica (jak v-model) — w
    // testach po kliknięciu trzeba ręcznie "odegrać" rodzica: odczytać
    // ostatni emitowany update:page i ustawić go przez setProps, tak jak
    // zrobiłby to Dashboard.vue podpięty pod @update:page.
    async function clickAndApplyPage(wrapper, selector) {
        await wrapper.find(selector).trigger('click')
        const emitted = wrapper.emitted('update:page')
        const newPage = emitted[emitted.length - 1][0]
        await wrapper.setProps({ page: newPage })
        return newPage
    }

    it('clientPaginate=true dzieli cały zbiór na strony i pokazuje numerowaną paginację', async () => {
        const tests = Array.from({ length: 45 }, (_, i) => ({
            id: i + 1,
            title: `Test ${i + 1}`,
            status_id: 1,
        }))
        const wrapper = mount(TestList, {
            props: { tests, clientPaginate: true, pageSize: 20, page: 1 },
        })

        expect(wrapper.findAll('[data-testid="test-item"]')).toHaveLength(20)
        expect(wrapper.find('[data-testid="tests-page-1"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tests-page-2"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tests-page-3"]').exists()).toBe(true)

        await clickAndApplyPage(wrapper, '[data-testid="tests-page-3"]')

        expect(wrapper.findAll('[data-testid="test-item"]')).toHaveLength(5)
        expect(wrapper.find('[data-testid="test-item"]').text()).toContain('Test 41')
    })

    it('clientPaginate=true: "Prev"/"Next" są disabled na skrajnych stronach', async () => {
        const tests = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, title: `Test ${i + 1}`, status_id: 1 }))
        const wrapper = mount(TestList, { props: { tests, clientPaginate: true, pageSize: 20, page: 1 } })

        expect(wrapper.find('[data-testid="tests-prev"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[data-testid="tests-next"]').attributes('disabled')).toBeUndefined()

        await clickAndApplyPage(wrapper, '[data-testid="tests-next"]')

        expect(wrapper.find('[data-testid="tests-prev"]').attributes('disabled')).toBeUndefined()
        expect(wrapper.find('[data-testid="tests-next"]').attributes('disabled')).toBeDefined()
    })

    it('clientPaginate=true: emituje visible-tests-changed z testami z bieżącej strony', async () => {
        const tests = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, title: `Test ${i + 1}`, status_id: 1 }))
        const wrapper = mount(TestList, { props: { tests, clientPaginate: true, pageSize: 20, page: 1 } })

        const emitted = wrapper.emitted('visible-tests-changed')
        expect(emitted).toBeTruthy()
        expect(emitted[emitted.length - 1][0]).toHaveLength(20)

        await clickAndApplyPage(wrapper, '[data-testid="tests-next"]')

        const afterNext = wrapper.emitted('visible-tests-changed')
        expect(afterNext[afterNext.length - 1][0]).toHaveLength(5)
    })

    it('clientPaginate=true: zmiana wyszukiwania resetuje na stronę 1', async () => {
        const tests = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, title: `Test ${i + 1}`, status_id: 1 }))
        const wrapper = mount(TestList, { props: { tests, clientPaginate: true, pageSize: 20, page: 1 } })

        await clickAndApplyPage(wrapper, '[data-testid="tests-next"]')
        expect(wrapper.findAll('[data-testid="test-item"]')).toHaveLength(5)

        await wrapper.find('[data-testid="tests-search"]').setValue('Test 1')
        // page powinien wrócić na 1 (emit update:page) — "odegraj" rodzica
        const emitted = wrapper.emitted('update:page')
        await wrapper.setProps({ page: emitted[emitted.length - 1][0] })

        // "Test 1", "Test 10".."Test 19" pasują (11 wyników), strona wraca na 1
        const items = wrapper.findAll('[data-testid="test-item"]')
        expect(items.length).toBeGreaterThan(5)
        expect(items[0].text()).toContain('Test 1')
    })
})
