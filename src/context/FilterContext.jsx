import { createContext, useContext, useState, useCallback, useMemo } from 'react'

// -----------------------------------------------------------------------------
// FilterContext
// -----------------------------------------------------------------------------
// Global filter state shared by every module. Because it lives in React context
// at the app root, the selection is kept when navigating from one module to
// another (it does NOT reset on back-navigation), which is a requirement from
// the plan.
//
// Two independent dimensions:
//   - part:       'all' | 1 | 2 | 3        (single choice)
//   - categories: array of category ids     (multi-select; [] means "all")
//
// The empty array intentionally means "all categories". This keeps the default
// state simple (nothing selected = nothing filtered out).
// -----------------------------------------------------------------------------

const FilterContext = createContext(null)

export function FilterProvider({ children }) {
  const [part, setPartState] = useState('all')
  const [categories, setCategories] = useState([])

  // Change the selected part. Callers that know which category ids remain
  // valid for the new part (see lib/categoryFilter) can pass them as
  // `validCategoryIds` so any now-invisible category is dropped from the
  // selection — otherwise it would keep silently filtering results without
  // a visible chip to explain why ("ghost" selection).
  const setPart = useCallback((newPart, validCategoryIds) => {
    setPartState(newPart)
    if (validCategoryIds) {
      setCategories((prev) => prev.filter((id) => validCategoryIds.includes(id)))
    }
  }, [])

  // Toggle a single category id on/off in the multi-select list.
  const toggleCategory = useCallback((id) => {
    setCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }, [])

  // Reset everything back to "show all".
  const clearFilters = useCallback(() => {
    setPart('all')
    setCategories([])
  }, [])

  // Does a single data item (which has .part and .category) pass the filter?
  const matchesFilter = useCallback(
    (item) => {
      const partOk = part === 'all' || item.part === part
      const categoryOk = categories.length === 0 || categories.includes(item.category)
      return partOk && categoryOk
    },
    [part, categories],
  )

  // Convenience: filter a whole array of items by the current filter.
  const filterItems = useCallback((items) => items.filter(matchesFilter), [matchesFilter])

  // useMemo so the context value object is stable between renders unless one of
  // its dependencies actually changes (avoids needless re-renders in consumers).
  const value = useMemo(
    () => ({
      part,
      setPart,
      categories,
      toggleCategory,
      clearFilters,
      matchesFilter,
      filterItems,
      // True when the user has narrowed the view in any way.
      isFiltered: part !== 'all' || categories.length > 0,
    }),
    [part, categories, toggleCategory, clearFilters, matchesFilter, filterItems],
  )

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}

// Small hook so components can read the filter without importing the context
// object directly. Throws a clear error if used outside the provider.
export function useFilter() {
  const ctx = useContext(FilterContext)
  if (!ctx) {
    throw new Error('useFilter must be used inside a <FilterProvider>')
  }
  return ctx
}
