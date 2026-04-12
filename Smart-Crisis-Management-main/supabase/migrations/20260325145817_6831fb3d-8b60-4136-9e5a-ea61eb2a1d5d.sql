CREATE POLICY "Admins can update volunteer status"
ON public.volunteer_status
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete volunteer status"
ON public.volunteer_status
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));