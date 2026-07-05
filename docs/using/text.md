# Designing Text Descriptions

The **Text** tab controls the structure of the **Description** view — the keyboard- and screen-reader-navigable tree, powered by [Olli](https://umwelt-data.github.io/olli/), that lets you explore the data as text.

By default you don't have to touch it. Umwelt infers a faithful description from your chart (or, with no chart, from the fields): a company grouping over the axes, a facet nesting its panels, and so on. The Text tab shows that inferred structure as an **editable starting point** — the moment you change it, that view's description becomes yours to shape.

## What you're editing

The description is a **tree**. Each level is a way of dividing the data, and its children divide it further. There are two kinds of node:

- **Group** — split the data by a field (or several crossed fields), one branch per value or bucket. "Group by `symbol`" gives one branch per company; nesting "Group by `date`" under it gives each company's dates.
- **Highlight** — a named, hand-defined subset that no field grouping expresses, such as *After 1975* or *Strong months*. You give it a name and one or more conditions.

Add nodes with **Add group** / **Add highlight**, and build hierarchy with **Add child group** / **Add child highlight** under any node. Drag to reorder siblings. The heading of each node ("Group by `date`", "Data highlight: Strong months") reads the way it will in the output, so the editor and the described tree share one vocabulary.

## One structure per view

If your spec has a visualization, the Text tab shows one structure **per visual unit** — each chart view keeps its own description, so its mark, axes, and legends still read in visualization language while any groupings you add on other fields read plainly. With no visualization, there's a single structure describing the dataset as a whole.

**Reset to auto-generated** discards your edits for that view and returns it to Umwelt's inferred structure.

## Grouping options

A group node divides continuous fields into buckets before branching. Under a group field's **Additional options** you can override, for that grouping only:

- **Type** — how the field is bucketed. Treating a quantitative or temporal field as `ordinal` gives one branch per distinct value; leaving it quantitative or temporal produces range bins.
- **Bin** / **Time unit** — coarsen a quantitative or temporal field into intervals or calendar buckets.

These affect only how this node groups; the field's own definition and its other usages are untouched. Grouping the same field two different ways in different branches is allowed — Umwelt keeps them independent.

## Highlights

A highlight is a predicate: a name plus a set of conditions combined with *and*. Pick a field, an operator (`is`, `is one of`, `<`, `in range`, `is valid`, …, offered to match the field's type), and a value. Temporal fields get a date picker, quantitative fields a number input. The result is a named branch in the description covering exactly the rows that match — useful for calling out an editorially meaningful slice the chart's own groupings don't surface.

## Next

- [Exploring the Viewer](/using/viewer#description) — navigating the description with the keyboard and a screen reader.
- [Sharing & Export](/using/sharing) — the authored structure travels with the spec.
